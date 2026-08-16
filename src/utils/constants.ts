/**
 * constants.ts — Application-wide constants for the Private Allowlist dApp.
 *
 * These values define cryptographic parameters and privacy guarantees.
 */

// ─── Cryptographic Constants ──────────────────────────────────────────────────

/** Domain separator for nullifier computation: hash(address || NULLIFIER_DOMAIN) */
export const NULLIFIER_DOMAIN = 'midnight-private-allowlist:nullifier:v1';

/** Domain separator for leaf hashing: hash(address || LEAF_DOMAIN || salt) */
export const LEAF_DOMAIN = 'midnight-private-allowlist:leaf:v1';

/** Domain separator for commitment: hash(leafHash || nonce || COMMITMENT_DOMAIN) */
export const COMMITMENT_DOMAIN = 'midnight-private-allowlist:commitment:v1';

/** Default tree depth (supports up to 2^10 = 1024 members without revealing size) */
export const DEFAULT_TREE_DEPTH = 10;

/** Zero leaf — used to pad the Merkle tree to a power of 2 */
export const ZERO_LEAF = '0'.repeat(64);

// ─── Proof Validity ───────────────────────────────────────────────────────────

/** Proof expiry in seconds (default: 5 minutes) */
export const PROOF_EXPIRY_SECONDS = 300;

/** Maximum number of Merkle path nodes */
export const MAX_MERKLE_DEPTH = 20;

// ─── Network ──────────────────────────────────────────────────────────────────

export const MIDNIGHT_NETWORK = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
} as const;

export type MidnightNetwork = typeof MIDNIGHT_NETWORK[keyof typeof MIDNIGHT_NETWORK];

export const MIDNIGHT_TESTNET_INDEXER = 'https://indexer.testnet.midnight.network/api/v1/graphql';
export const MIDNIGHT_TESTNET_INDEXER_WS = 'wss://indexer.testnet.midnight.network/api/v1/graphql/ws';
export const MIDNIGHT_PROOF_SERVER = 'http://localhost:6300';

// ─── Contract ─────────────────────────────────────────────────────────────────

/** Placeholder for deployed contract address — update after deployment */
export const CONTRACT_ADDRESS_PLACEHOLDER = '<YOUR_DEPLOYED_ADDRESS_HERE>';

// ─── Privacy Labels ───────────────────────────────────────────────────────────

/**
 * What an observer CAN learn from the blockchain:
 * - A valid membership proof was submitted
 * - Public verification result (accepted/rejected)
 * - Aggregate statistics (total verifications/rejections)
 * - The current Merkle root (a hash of the allowlist)
 * - That a proof nullifier was consumed
 */
export const OBSERVER_CAN_LEARN = [
  'A valid membership proof was submitted',
  'Public verification result (accepted/rejected)',
  'Aggregate statistics (total verifications/rejections)',
  'Current Merkle root (opaque hash)',
  'Whether a proof nullifier was used',
];

/**
 * What an observer CANNOT learn from the blockchain:
 * - Which specific address submitted the proof
 * - Whether a specific address is on the allowlist
 * - The full list of allowlist members
 * - The size of the allowlist
 * - The member's position in the tree
 */
export const OBSERVER_CANNOT_LEARN = [
  "Which address submitted the proof",
  "Whether a specific address is on the allowlist",
  "The full list of allowlist members",
  "The size of the allowlist",
  "The member's position in the Merkle tree",
];
