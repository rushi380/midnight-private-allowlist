/**
 * routes.ts — Express API routes for the Private Allowlist dApp.
 *
 * Endpoints:
 *   GET  /api/public-root        — Returns current public Merkle root
 *   GET  /api/stats              — Returns aggregate verification statistics
 *   POST /api/generate-proof     — Generates a ZK membership proof
 *   POST /api/verify-proof       — Verifies a membership proof
 *   POST /api/admin/set-root     — Updates Merkle root (admin only)
 *   POST /api/admin/set-allowlist — Rebuilds allowlist (admin only)
 *
 * Privacy: User addresses submitted to /api/generate-proof are used
 * locally only — they never appear in logs, responses, or stored state.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { PrivateMerkleTree } from '../services/merkleTree';
import { ProofService } from '../services/proofService';
import { VerificationService } from '../services/verificationService';
import { ContractService } from '../services/contractService';
import type {
  GenerateProofRequest,
  GenerateProofResponse,
  VerifyProofRequest,
  VerifyProofResponse,
  PublicRootResponse,
} from '../contracts/types/index';
import config from '../utils/config';

// ─── Shared service instances (singletons) ────────────────────────────────────

// Default allowlist (in production, load from a private data store or IPFS)
const DEFAULT_ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

let currentAllowlist = [...DEFAULT_ALLOWLIST];
let merkleTree = new PrivateMerkleTree({ salt: config.privacy.commitmentSecret });
merkleTree.buildTree(currentAllowlist);

const proofService = new ProofService({
  nullifierSecret: config.privacy.commitmentSecret,
  treeSalt: config.privacy.commitmentSecret,
  expirySeconds: config.privacy.proofExpirySeconds,
});

const verificationService = new VerificationService({
  merkleRoot: merkleTree.getRoot(),
  expirySeconds: config.privacy.proofExpirySeconds,
  treeSalt: config.privacy.commitmentSecret,
});

const contractService = new ContractService({
  simulate: true,
  adminSecret: config.privacy.commitmentSecret,
});

export const router = Router();

// ─── Middleware ───────────────────────────────────────────────────────────────

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── GET /api/public-root ─────────────────────────────────────────────────────

router.get(
  '/public-root',
  asyncHandler(async (_req, res) => {
    const root = merkleTree.getRoot();
    const contractState = await contractService.getContractState();

    const response: PublicRootResponse = {
      merkleRoot: root,
      contractAddress: contractState.contractAddress ?? '<NOT_DEPLOYED>',
      network: config.midnight.network,
      updatedAt: Date.now(),
    };

    res.json(response);
  })
);

// ─── GET /api/stats ───────────────────────────────────────────────────────────

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const stats = await contractService.getStats();
    res.json({
      success: true,
      stats,
      network: config.midnight.network,
      merkleRoot: merkleTree.getRoot(),
      memberCount: merkleTree.getState().leafCount,
    });
  })
);

// ─── POST /api/generate-proof ─────────────────────────────────────────────────

router.post(
  '/generate-proof',
  asyncHandler(async (req, res) => {
    const body = req.body as GenerateProofRequest;

    if (!body?.address) {
      res.status(400).json({
        success: false,
        message: 'Request body must include an "address" field',
      } as GenerateProofResponse);
      return;
    }

    try {
      // The address is used locally ONLY — never stored, logged, or returned
      const proof = proofService.generateProof(body.address, currentAllowlist);

      const response: GenerateProofResponse = {
        success: true,
        proof,
        message: 'Proof generated successfully. Your identity is protected.',
      };

      res.json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      // Mask any potential address leak in error messages
      const safeMessage = message.replace(/0x[0-9a-fA-F]{10,}/g, '0x***');

      res.status(400).json({
        success: false,
        message: safeMessage,
      } as GenerateProofResponse);
    }
  })
);

// ─── POST /api/verify-proof ───────────────────────────────────────────────────

router.post(
  '/verify-proof',
  asyncHandler(async (req, res) => {
    const body = req.body as VerifyProofRequest;

    if (!body?.proof) {
      res.status(400).json({
        success: false,
        message: 'Request body must include a "proof" field',
      } as VerifyProofResponse);
      return;
    }

    try {
      const result = verificationService.verifyProof(body.proof, body.expectedRoot);

      const response: VerifyProofResponse = {
        success: true,
        result,
        message: result.isValid
          ? 'Membership verified — access granted'
          : `Verification failed: ${result.message}`,
      };

      res.status(result.isValid ? 200 : 403).json(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification error';
      res.status(500).json({
        success: false,
        message,
      } as VerifyProofResponse);
    }
  })
);

// ─── POST /api/admin/set-allowlist ────────────────────────────────────────────

router.post(
  '/admin/set-allowlist',
  asyncHandler(async (req, res) => {
    const { addresses, adminSecret } = req.body as {
      addresses: string[];
      adminSecret: string;
    };

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid addresses array' });
      return;
    }

    // Simple admin auth (use JWT in production)
    if (adminSecret !== config.privacy.commitmentSecret) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Rebuild the Merkle tree with the new allowlist
    currentAllowlist = addresses;
    merkleTree = new PrivateMerkleTree({ salt: config.privacy.commitmentSecret });
    merkleTree.buildTree(currentAllowlist);
    verificationService.updateRoot(merkleTree.getRoot());

    res.json({
      success: true,
      message: 'Allowlist updated',
      newRoot: merkleTree.getRoot(),
      memberCount: merkleTree.getState().leafCount,
    });
  })
);

// ─── Error handler ────────────────────────────────────────────────────────────

export function apiErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[API Error]', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
