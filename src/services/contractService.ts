/**
 * contractService.ts — Midnight smart contract interaction service.
 *
 * Provides a TypeScript interface for interacting with the deployed
 * PrivateAllowlist.compact contract on the Midnight testnet.
 *
 * In production: uses the Midnight SDK (@midnight-ntwrk/midnight-js-*)
 * In development/tests: uses a simulated in-memory contract state
 *
 * To switch to real Midnight SDK calls, replace the SimulatedContract
 * class methods with actual SDK calls and uncomment the SDK imports.
 */
import { PrivateMerkleTree } from './merkleTree';
import { sha256Hex } from './merkleTree';
import type {
  ContractState,
  ContractStats,
  Bytes32,
  ProofData,
} from '../contracts/types/index';

// ─── Production SDK imports (uncomment when deploying to testnet) ─────────────
// import { createMidnightClient } from '@midnight-ntwrk/midnight-js-client';
// import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';

// ─── Simulated Contract (for local development & CI) ─────────────────────────

/**
 * Simulates the on-chain PrivateAllowlist contract state.
 * This allows all tests and local development to work without a live network.
 */
class SimulatedContract {
  private state: ContractState = {
    merkleRoot: '0'.repeat(64),
    verificationCount: BigInt(0),
    rejectionCount: BigInt(0),
    initialized: false,
    contractAddress: process.env['CONTRACT_ADDRESS'] ?? '<YOUR_DEPLOYED_ADDRESS_HERE>',
  };

  private usedNullifiers: Map<Bytes32, number> = new Map();

  initialize(initialRoot: Bytes32, adminCommitment: Bytes32): void {
    if (this.state.initialized) {
      throw new Error('Contract already initialized');
    }
    this.state.merkleRoot = initialRoot;
    this.state.initialized = true;
    console.log(`[SimulatedContract] Initialized with root: ${initialRoot.slice(0, 16)}...`);
    console.log(`[SimulatedContract] Admin commitment: ${adminCommitment.slice(0, 16)}...`);
  }

  setMerkleRoot(newRoot: Bytes32, adminSecret: Bytes32, storedAdminCommitment: Bytes32): void {
    if (!this.state.initialized) throw new Error('Contract not initialized');
    const computed = sha256Hex(adminSecret);
    if (computed !== storedAdminCommitment) {
      throw new Error('Unauthorized: invalid admin secret');
    }
    this.state.merkleRoot = newRoot;
    console.log(`[SimulatedContract] Merkle root updated to: ${newRoot.slice(0, 16)}...`);
  }

  verifyMembership(proof: ProofData): boolean {
    if (!this.state.initialized) throw new Error('Contract not initialized');

    if (this.usedNullifiers.has(proof.nullifier)) {
      this.state.rejectionCount++;
      return false;
    }

    if (proof.merkleRoot !== this.state.merkleRoot) {
      this.state.rejectionCount++;
      return false;
    }

    // Record nullifier
    this.usedNullifiers.set(proof.nullifier, Date.now());
    this.state.verificationCount++;
    return true;
  }

  getRoot(): Bytes32 {
    return this.state.merkleRoot;
  }

  getState(): ContractState {
    return { ...this.state };
  }
}

// ─── ContractService ──────────────────────────────────────────────────────────

export interface ContractServiceConfig {
  /** Use simulated contract (true for dev/test, false for production) */
  simulate?: boolean;
  /** Admin secret for local simulation */
  adminSecret?: string;
}

export class ContractService {
  private readonly simulate: boolean;
  private simContract: SimulatedContract;
  private adminCommitment: Bytes32 = '0'.repeat(64);

  constructor(config: ContractServiceConfig = {}) {
    this.simulate = config.simulate ?? (process.env['NODE_ENV'] !== 'production');
    this.simContract = new SimulatedContract();

    // Compute admin commitment from secret
    const adminSecret = config.adminSecret ?? process.env['COMMITMENT_SECRET'] ?? 'dev-secret';
    this.adminCommitment = sha256Hex(adminSecret);
  }

  // ── Deployment ──────────────────────────────────────────────────────────────

  /**
   * Deploys the contract to Midnight testnet and returns the contract address.
   * In simulation mode, initializes the in-memory contract.
   *
   * @param allowlist   Initial allowlist for computing the first Merkle root
   * @param treeSalt    Salt used for leaf hashing
   */
  async deployContract(allowlist: string[], treeSalt: string): Promise<string> {
    const tree = new PrivateMerkleTree({ salt: treeSalt });
    tree.buildTree(allowlist);
    const initialRoot = tree.getRoot();

    if (this.simulate) {
      this.simContract.initialize(initialRoot, this.adminCommitment);
      const simulatedAddress = `mn1${sha256Hex('simulated-contract').slice(0, 40)}`;
      console.log(`[ContractService] Simulated deployment at: ${simulatedAddress}`);
      return simulatedAddress;
    }

    // TODO: Production deployment using Midnight SDK
    // const client = await createMidnightClient({ ... });
    // const contract = await deployContract(client, 'PrivateAllowlist', { ... });
    // return contract.address;
    throw new Error('Production deployment requires the Midnight SDK. See docs/DEPLOYMENT.md');
  }

  // ── Contract Functions ──────────────────────────────────────────────────────

  /** Sets a new Merkle root (admin only). */
  async setMerkleRoot(
    newRoot: Bytes32,
    adminSecret: string,
    allowlist: string[],
    treeSalt: string
  ): Promise<void> {
    if (this.simulate) {
      this.simContract.setMerkleRoot(newRoot, sha256Hex(adminSecret), this.adminCommitment);
      return;
    }
    // TODO: call contract.set_merkle_root circuit via Midnight SDK
    throw new Error('Requires Midnight SDK');
  }

  /** Verifies a membership proof on-chain. */
  async verifyMembership(proof: ProofData): Promise<boolean> {
    if (this.simulate) {
      return this.simContract.verifyMembership(proof);
    }
    // TODO: call contract.verify_membership circuit via Midnight SDK
    throw new Error('Requires Midnight SDK');
  }

  /** Gets the current public Merkle root from the contract. */
  async getMerkleRoot(): Promise<Bytes32> {
    if (this.simulate) {
      return this.simContract.getRoot();
    }
    // TODO: call contract.get_root circuit via Midnight SDK
    throw new Error('Requires Midnight SDK');
  }

  /** Gets aggregate contract statistics. */
  async getStats(): Promise<ContractStats> {
    if (this.simulate) {
      const state = this.simContract.getState();
      const verifications = Number(state.verificationCount);
      const rejections = Number(state.rejectionCount);
      const total = verifications + rejections;
      return {
        verificationCount: verifications,
        rejectionCount: rejections,
        successRate: total > 0 ? (verifications / total) * 100 : 0,
        lastUpdated: Date.now(),
      };
    }
    throw new Error('Requires Midnight SDK');
  }

  /** Gets the full contract state. */
  async getContractState(): Promise<ContractState> {
    if (this.simulate) {
      return this.simContract.getState();
    }
    throw new Error('Requires Midnight SDK');
  }

  isSimulated(): boolean {
    return this.simulate;
  }
}
