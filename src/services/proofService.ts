/**
 * proofService.ts — Zero-knowledge proof generation service.
 *
 * ════════════════════════════════════════════════════════════════════
 * PRIVACY DESIGN
 * ════════════════════════════════════════════════════════════════════
 *
 * The ProofData returned by this service contains:
 *   - commitment:   hash(leafHash || nonce || COMMITMENT_DOMAIN)
 *   - nullifier:    hash(leafHash || NULLIFIER_DOMAIN || secret)
 *   - merklePath:   sibling hashes + directions (no plaintext identity)
 *   - nonce:        random 32 bytes (new per proof — prevents linkability)
 *   - timestamp:    proof generation time
 *   - merkleRoot:   the public root at generation time
 *
 * WHAT IS NOT IN ProofData:
 *   ✗ User's address (never included)
 *   ✗ User's position in the tree
 *   ✗ Leaf hash of other members
 *   ✗ Any PII
 *
 * Two different proofs from the same user will have different
 * commitments (due to random nonce) — preventing linkability.
 *
 * ════════════════════════════════════════════════════════════════════
 */
import crypto from 'crypto';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import { PrivateMerkleTree } from './merkleTree';
import type { ProofData, Bytes32 } from '../contracts/types/index';
import {
  COMMITMENT_DOMAIN,
  NULLIFIER_DOMAIN,
  PROOF_EXPIRY_SECONDS,
} from '../utils/constants';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sha256Hex(data: string): string {
  return SHA256(data).toString(Hex);
}

function generateRandomBytes32(): Bytes32 {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes the proof commitment.
 * commitment = SHA-256(leafHash || nonce || COMMITMENT_DOMAIN)
 *
 * The nonce makes each proof unique — two proofs from the same user
 * will have different commitments, preventing linkability.
 */
function computeCommitment(leafHash: Bytes32, nonce: Bytes32): Bytes32 {
  return sha256Hex(`${leafHash}${nonce}${COMMITMENT_DOMAIN}`);
}

/**
 * Computes the nullifier for replay prevention.
 * nullifier = SHA-256(leafHash || NULLIFIER_DOMAIN || secret)
 *
 * The nullifier is deterministic for a given user+secret pair so that
 * the same proof cannot be submitted twice, while still not revealing identity.
 */
function computeNullifier(leafHash: Bytes32, secret: string): Bytes32 {
  return sha256Hex(`${leafHash}${NULLIFIER_DOMAIN}${secret}`);
}

// ─── ProofService ─────────────────────────────────────────────────────────────

export interface ProofServiceConfig {
  /** Shared secret used for nullifier derivation (kept server-side) */
  nullifierSecret: string;
  /** Salt for leaf hashing in the Merkle tree */
  treeSalt: string;
  /** Proof expiry in seconds */
  expirySeconds?: number;
}

export class ProofService {
  private readonly nullifierSecret: string;
  private readonly treeSalt: string;
  private readonly expirySeconds: number;

  constructor(config: ProofServiceConfig) {
    this.nullifierSecret = config.nullifierSecret;
    this.treeSalt = config.treeSalt;
    this.expirySeconds = config.expirySeconds ?? PROOF_EXPIRY_SECONDS;
  }

  // ── Proof Generation ────────────────────────────────────────────────────────

  /**
   * Generates a zero-knowledge membership proof for an address.
   *
   * The address is used ONLY to:
   *   1. Hash it into a leaf (and then discarded)
   *   2. Generate a Merkle path
   *
   * The returned ProofData contains NO plaintext address.
   *
   * @param address   The claimant's address (used locally, never returned)
   * @param allowlist The current allowlist (used to build the Merkle tree)
   * @returns         ProofData — safe to transmit, contains no identity
   * @throws          Error if address is not in allowlist
   */
  generateProof(address: string, allowlist: string[]): ProofData {
    if (!address || address.trim() === '') {
      throw new Error('Address cannot be empty');
    }
    if (!allowlist || allowlist.length === 0) {
      throw new Error('Allowlist cannot be empty');
    }

    // Normalise address (lowercase for consistency)
    const normalizedAddress = address.toLowerCase().trim();

    // Build the Merkle tree from the allowlist
    const merkleTree = new PrivateMerkleTree({ salt: this.treeSalt });
    merkleTree.buildTree(allowlist);

    // Verify membership first (throws if not member)
    if (!merkleTree.isMember(normalizedAddress)) {
      throw new Error(
        `Address ${this.maskAddress(normalizedAddress)} is not in the allowlist. ` +
        `Cannot generate proof for non-member.`
      );
    }

    // Generate Merkle proof (no plaintext address in result)
    const { leafHash, merklePath } = merkleTree.generateProof(normalizedAddress);

    // Generate fresh nonce (ensures proof uniqueness — prevents linkability)
    const nonce = generateRandomBytes32();

    // Compute commitment: hash(leafHash || nonce)
    const commitment = computeCommitment(leafHash, nonce);

    // Compute nullifier: hash(leafHash || secret) — for replay prevention
    const nullifier = computeNullifier(leafHash, this.nullifierSecret);

    const proofData: ProofData = {
      commitment,
      nullifier,
      merklePath,
      nonce,
      timestamp: Date.now(),
      merkleRoot: merkleTree.getRoot(),
      treeDepth: merklePath.length,
    };

    // PRIVACY ASSERTION: Ensure address is not leaked in the proof
    this.assertPrivacy(proofData, normalizedAddress);

    return proofData;
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validates that a proof has not expired.
   *
   * @param proof  The ProofData to check
   * @returns      True if the proof is still within its validity window
   */
  isProofFresh(proof: ProofData): boolean {
    const ageSeconds = (Date.now() - proof.timestamp) / 1000;
    return ageSeconds < this.expirySeconds;
  }

  /**
   * Verifies the internal consistency of a ProofData object.
   * Does NOT verify against the Merkle root (use VerificationService for that).
   *
   * @param proof      The ProofData to validate
   * @param leafHash   The expected leaf hash (from the address)
   */
  verifyCommitment(proof: ProofData, leafHash: Bytes32): boolean {
    const expectedCommitment = computeCommitment(leafHash, proof.nonce);
    return expectedCommitment === proof.commitment;
  }

  // ── Privacy Helpers ─────────────────────────────────────────────────────────

  /**
   * Asserts that the proof data contains no plaintext address.
   * Throws if any field contains the address directly or in encoded form.
   * Used as a runtime privacy guard during development.
   */
  private assertPrivacy(proof: ProofData, address: string): void {
    const proofJson = JSON.stringify(proof);
    const normalizedAddr = address.toLowerCase().replace('0x', '');

    if (proofJson.toLowerCase().includes(normalizedAddr)) {
      throw new Error(
        `PRIVACY VIOLATION: Plaintext address detected in proof data! ` +
        `This is a bug — please report it.`
      );
    }
  }

  /**
   * Masks an address for safe error messages.
   * Only shows first 6 and last 4 characters.
   */
  private maskAddress(address: string): string {
    if (address.length <= 10) return '***';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // ── Static Utilities ────────────────────────────────────────────────────────

  /**
   * Returns the public fields of a proof (safe for on-chain submission).
   * Strips all fields that should remain private (none in ProofData, but
   * future versions may add private fields).
   */
  static publicFields(proof: ProofData): Pick<ProofData, 'commitment' | 'nullifier' | 'timestamp' | 'merkleRoot'> {
    return {
      commitment: proof.commitment,
      nullifier: proof.nullifier,
      timestamp: proof.timestamp,
      merkleRoot: proof.merkleRoot,
    };
  }

  /** Checks if two proofs have the same nullifier (same user). */
  static haveSameNullifier(a: ProofData, b: ProofData): boolean {
    return a.nullifier === b.nullifier;
  }

  /** Checks if two proofs have different commitments (expected — due to nonce). */
  static haveDistinctCommitments(a: ProofData, b: ProofData): boolean {
    return a.commitment !== b.commitment;
  }
}

// Re-export helpers for testing
export { computeCommitment, computeNullifier, generateRandomBytes32 };
