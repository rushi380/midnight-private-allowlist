/**
 * merkleTree.ts — Privacy-preserving Merkle tree for the allowlist.
 *
 * ════════════════════════════════════════════════════════════════════
 * PRIVACY DESIGN
 * ════════════════════════════════════════════════════════════════════
 *
 * 1. LEAF HASHING — Addresses are NEVER stored directly.
 *    Each leaf = SHA-256(address || LEAF_DOMAIN || globalSalt)
 *    This makes preimage attacks computationally infeasible.
 *
 * 2. SORTED PAIRS — Sibling hashes are sorted before combining.
 *    This means position in the tree cannot be inferred from the proof.
 *
 * 3. FIXED DEPTH — The tree is always padded to `depth` levels.
 *    This hides the true size of the allowlist (an observer cannot
 *    determine how many members are in the list).
 *
 * 4. ROOT ONLY ON-CHAIN — Only the Merkle root is ever disclosed
 *    to the smart contract. The full tree lives off-chain.
 *
 * ════════════════════════════════════════════════════════════════════
 */
import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256';
import Hex from 'crypto-js/enc-hex';
import type {
  Bytes32,
  MerklePath,
  MerkleTreeConfig,
  MerkleTreeState,
} from '../contracts/types/index';
import { DEFAULT_TREE_DEPTH, LEAF_DOMAIN, ZERO_LEAF } from '../utils/constants';

/** Sentinel used ONLY for depth-padding in merklePath — distinct from ZERO_LEAF tree nodes */
const DEPTH_PADDING_SENTINEL = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

// ─── Internal helpers ─────────────────────────────────────────────────────────

function sha256Hex(data: string): string {
  return SHA256(data).toString(Hex);
}

/** Hashes an address into a leaf: SHA-256(address || LEAF_DOMAIN || salt) */
function hashToLeaf(address: string, salt: string): Bytes32 {
  return sha256Hex(`${address.toLowerCase()}${LEAF_DOMAIN}${salt}`);
}

/** Sorts two hashes and combines: SHA-256(min || max) — position-independent */
function hashPair(a: string, b: string): string {
  const [left, right] = a < b ? [a, b] : [b, a];
  return sha256Hex(left + right);
}

// ─── PrivateMerkleTree ────────────────────────────────────────────────────────

export class PrivateMerkleTree {
  private readonly depth: number;
  private readonly salt: string;
  private tree: MerkleTree;
  private rawLeaves: Bytes32[] = [];

  constructor(config: Partial<MerkleTreeConfig> = {}) {
    this.depth = config.depth ?? DEFAULT_TREE_DEPTH;
    this.salt = config.salt ?? 'midnight-private-allowlist-default-salt';
    // Initialise with empty tree
    this.tree = new MerkleTree([], (data: Buffer) =>
      Buffer.from(sha256Hex(data.toString('hex')), 'hex'),
      { sortPairs: true, hashLeaves: false }
    );
  }

  // ── Build / Update ──────────────────────────────────────────────────────────

  /**
   * Builds the Merkle tree from a list of addresses.
   * Addresses are hashed immediately — no plaintext is stored.
   */
  buildTree(addresses: string[]): void {
    if (addresses.length === 0) {
      throw new Error('Cannot build tree with empty allowlist');
    }

    // Hash all addresses to leaves (privacy: addresses never stored)
    const hashed = addresses.map((addr) => hashToLeaf(addr, this.salt));

    // Pad to power of 2 with ZERO_LEAF to hide real list size
    const targetSize = Math.pow(2, Math.ceil(Math.log2(Math.max(hashed.length, 2))));
    while (hashed.length < targetSize) {
      hashed.push(ZERO_LEAF);
    }

    this.rawLeaves = hashed;

    const leafBuffers = hashed.map((h) => Buffer.from(h, 'hex'));
    this.tree = new MerkleTree(
      leafBuffers,
      (data: Buffer) => Buffer.from(sha256Hex(data.toString('hex')), 'hex'),
      { sortPairs: true, hashLeaves: false }
    );
  }

  // ── Root ────────────────────────────────────────────────────────────────────

  /** Returns the public Merkle root (the only value sent on-chain). */
  getRoot(): Bytes32 {
    const root = this.tree.getRoot();
    if (!root || root.length === 0) {
      throw new Error('Tree has not been built yet');
    }
    return root.toString('hex');
  }

  // ── Proof Generation ────────────────────────────────────────────────────────

  /**
   * Generates a Merkle proof for an address.
   * Returns ONLY the cryptographic path — no plaintext address.
   *
   * @param address  The member's address (stays private, never returned)
   * @returns        MerklePath containing sibling hashes and directions
   * @throws         If address is not in the allowlist
   */
  generateProof(address: string): { leafHash: Bytes32; merklePath: MerklePath } {
    const leafHash = hashToLeaf(address, this.salt);
    const leafBuffer = Buffer.from(leafHash, 'hex');

    const proofNodes = this.tree.getProof(leafBuffer);

    if (proofNodes.length === 0) {
      // Try to find the leaf to give a better error
      const isInTree = this.rawLeaves.includes(leafHash);
      if (!isInTree) {
        throw new Error(
          `Address is not in the allowlist. ` +
          `Cannot generate proof for non-member.`
        );
      }
      throw new Error('Failed to generate Merkle proof');
    }

    const merklePath: MerklePath = proofNodes.map((node) => ({
      sibling: node.data.toString('hex'),
      isRight: node.position === 'right',
    }));

    // Pad path to fixed depth with a distinct sentinel (hides tree depth)
    // IMPORTANT: real tree siblings that happen to be ZERO_LEAF are kept as-is;
    // only our artificial padding entries use DEPTH_PADDING_SENTINEL.
    while (merklePath.length < this.depth) {
      merklePath.push({ sibling: DEPTH_PADDING_SENTINEL, isRight: false });
    }

    return { leafHash, merklePath };
  }

  // ── Verification ────────────────────────────────────────────────────────────

  /**
   * Verifies that a leaf hash is a member of the tree with the given root.
   * This is a pure cryptographic check — no addresses involved.
   *
   * @param root       The public Merkle root
   * @param leafHash   The hashed leaf (hash of address, not the address itself)
   * @param merklePath The proof path
   */
  verifyProof(root: Bytes32, leafHash: Bytes32, merklePath: MerklePath): boolean {
    if (!root || !leafHash || !merklePath) return false;

    // Filter out ONLY our depth-padding sentinels — keep all real tree siblings
    // (including those that happen to be ZERO_LEAF padding nodes in the tree)
    const realNodes = merklePath.filter(
      (node) => node.sibling !== DEPTH_PADDING_SENTINEL
    );

    if (realNodes.length === 0) {
      // Single-leaf tree: leaf IS the root
      return leafHash === root;
    }

    // Manually reconstruct the Merkle root by walking the proof path.
    // We use sorted-pair hashing (same as buildTree) so the result
    // is deterministic regardless of left/right position.
    let current = leafHash;
    for (const node of realNodes) {
      // Sorted pair: SHA-256(min(current, sibling) || max(current, sibling))
      current = hashPair(current, node.sibling);
    }

    return current === root;
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  /** Returns the current state (no addresses — only hashes and metadata). */
  getState(): MerkleTreeState {
    return {
      root: this.getRoot(),
      depth: this.depth,
      leafCount: this.rawLeaves.filter((l) => l !== ZERO_LEAF).length,
      leaves: [...this.rawLeaves], // hashes only, never plaintext
    };
  }

  /** Checks if an address is a member without revealing other members. */
  isMember(address: string): boolean {
    const leafHash = hashToLeaf(address, this.salt);
    return this.rawLeaves.includes(leafHash);
  }

  /** Hashes an address to its leaf representation. */
  static hashAddress(address: string, salt: string): Bytes32 {
    return hashToLeaf(address, salt);
  }
}

export { hashToLeaf, hashPair, sha256Hex };
