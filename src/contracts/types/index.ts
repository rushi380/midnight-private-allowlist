/**
 * Type definitions for the Midnight Private Allowlist dApp.
 *
 * These types mirror the Compact contract's ledger structure and are used
 * across the TypeScript services, API, and frontend.
 */

// ─── Cryptographic Primitives ─────────────────────────────────────────────────

/** 32-byte hash represented as a hex string */
export type Bytes32 = string;

/** A node in the Merkle tree */
export interface MerkleNode {
  hash: Bytes32;
  left?: MerkleNode;
  right?: MerkleNode;
}

/** A sibling node used in a Merkle proof path */
export interface MerklePathNode {
  /** Hash of the sibling node */
  sibling: Bytes32;
  /** True if the current node is on the right side */
  isRight: boolean;
}

/** Full Merkle proof path (up to 10 levels for our tree) */
export type MerklePath = MerklePathNode[];

// ─── Proof Data ────────────────────────────────────────────────────────────────

/**
 * Zero-knowledge proof data structure.
 *
 * PRIVACY GUARANTEE: This object contains NO plaintext addresses.
 * The leaf_hash is hash(address || salt) — irreversible without the salt.
 * The commitment is hash(leaf_hash || nonce) — unique per proof invocation.
 * The nullifier is hash(leaf_hash || domain_separator) — for replay prevention.
 */
export interface ProofData {
  /** Binding commitment: hash(leaf_hash || nonce) — public */
  commitment: Bytes32;
  /** Replay-prevention nullifier: hash(leaf_hash || domainSeparator) — public */
  nullifier: Bytes32;
  /** Merkle path (sibling hashes + directions) — goes to ZK prover */
  merklePath: MerklePath;
  /** Random nonce used in commitment — generated fresh per proof */
  nonce: Bytes32;
  /** Unix timestamp of proof generation */
  timestamp: number;
  /** Claimed Merkle root at proof generation time */
  merkleRoot: Bytes32;
  /** Depth of the Merkle tree */
  treeDepth: number;
}

// ─── Verification ──────────────────────────────────────────────────────────────

export interface VerificationResult {
  isValid: boolean;
  message: string;
  /** Timestamp when verification occurred */
  verifiedAt: number;
  /** The nullifier verified (public, for replay detection) */
  nullifier?: Bytes32;
  /** Error code if invalid */
  errorCode?: VerificationError;
}

export type VerificationError =
  | 'INVALID_MERKLE_PATH'
  | 'COMMITMENT_MISMATCH'
  | 'NULLIFIER_USED'
  | 'PROOF_EXPIRED'
  | 'ROOT_MISMATCH'
  | 'INVALID_TREE_DEPTH'
  | 'UNKNOWN_ERROR';

// ─── Contract State ────────────────────────────────────────────────────────────

/** Mirrors the on-chain ledger state of PrivateAllowlist.compact */
export interface ContractState {
  merkleRoot: Bytes32;
  verificationCount: bigint;
  rejectionCount: bigint;
  initialized: boolean;
  /** Contract address on Midnight testnet */
  contractAddress?: string;
}

export interface ContractStats {
  verificationCount: number;
  rejectionCount: number;
  successRate: number;
  lastUpdated: number;
}

// ─── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminConfig {
  /** Admin commitment: hash(adminSecret) — stored on-chain */
  adminCommitment: Bytes32;
  /** Used to derive admin_commitment — NEVER sent to contract */
  adminSecret?: Bytes32;
}

// ─── API Payloads ──────────────────────────────────────────────────────────────

export interface GenerateProofRequest {
  /** User's address (kept private — never leaves the client) */
  address: string;
  /** Optional: user-provided allowlist for local proof generation */
  allowlist?: string[];
}

export interface GenerateProofResponse {
  success: boolean;
  proof?: ProofData;
  message?: string;
}

export interface VerifyProofRequest {
  proof: ProofData;
  /** Expected Merkle root to verify against */
  expectedRoot?: Bytes32;
}

export interface VerifyProofResponse {
  success: boolean;
  result?: VerificationResult;
  message?: string;
}

export interface PublicRootResponse {
  merkleRoot: Bytes32;
  contractAddress: string;
  network: string;
  updatedAt: number;
}

// ─── Merkle Tree Service ────────────────────────────────────────────────────────

export interface MerkleTreeConfig {
  /** Number of levels in the tree */
  depth: number;
  /** Hash function to use */
  hashFn: 'sha256' | 'keccak256';
  /** Salt for leaf hashing (prevents preimage attacks) */
  salt?: string;
}

export interface MerkleTreeState {
  root: Bytes32;
  depth: number;
  leafCount: number;
  /** Sorted leaves (hashes only — no plaintext addresses) */
  leaves: Bytes32[];
}

// ─── Allowlist Member ──────────────────────────────────────────────────────────

/**
 * Private representation of an allowlist member.
 * The address is NEVER stored — only its hash is used.
 */
export interface AllowlistMember {
  /** SHA-256 hash of (address || salt) */
  leafHash: Bytes32;
  /** When this member was added */
  addedAt: number;
}

// ─── Nullifier Registry ────────────────────────────────────────────────────────

export interface NullifierEntry {
  nullifier: Bytes32;
  usedAt: number;
}
