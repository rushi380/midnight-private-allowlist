/**
 * merkleTree.test.ts
 *
 * TEST 1: Valid Member Proof Generation
 * ─────────────────────────────────────
 * Verifies that the Merkle tree correctly generates proofs for
 * whitelisted members and that no plaintext addresses appear in proofs.
 */
import { PrivateMerkleTree } from '../../src/services/merkleTree';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const VALID_MEMBER = ALLOWLIST[0];
const ANOTHER_MEMBER = ALLOWLIST[2];
const SALT = 'test-tree-salt-deterministic';

// ─── Test Suite: Merkle Tree ───────────────────────────────────────────────────

describe('PrivateMerkleTree', () => {

  // ── Tree construction ──────────────────────────────────────────────────────

  describe('buildTree', () => {
    it('should build a tree from a non-empty allowlist', () => {
      const tree = new PrivateMerkleTree({ salt: SALT });
      expect(() => tree.buildTree(ALLOWLIST)).not.toThrow();
      expect(tree.getRoot()).toBeDefined();
      expect(tree.getRoot().length).toBe(64); // 32 bytes hex
    });

    it('should throw when building from an empty allowlist', () => {
      const tree = new PrivateMerkleTree({ salt: SALT });
      expect(() => tree.buildTree([])).toThrow('Cannot build tree with empty allowlist');
    });

    it('should produce a deterministic root for the same allowlist', () => {
      const tree1 = new PrivateMerkleTree({ salt: SALT });
      const tree2 = new PrivateMerkleTree({ salt: SALT });
      tree1.buildTree(ALLOWLIST);
      tree2.buildTree(ALLOWLIST);
      expect(tree1.getRoot()).toBe(tree2.getRoot());
    });

    it('should produce different roots for different allowlists', () => {
      const tree1 = new PrivateMerkleTree({ salt: SALT });
      const tree2 = new PrivateMerkleTree({ salt: SALT });
      tree1.buildTree([ALLOWLIST[0]]);
      tree2.buildTree([ALLOWLIST[1]]);
      expect(tree1.getRoot()).not.toBe(tree2.getRoot());
    });
  });

  // ── TEST 1: Valid member proof generation ──────────────────────────────────

  describe('TEST 1 — should generate valid proof for whitelisted member', () => {
    let tree: PrivateMerkleTree;

    beforeEach(() => {
      tree = new PrivateMerkleTree({ salt: SALT });
      tree.buildTree(ALLOWLIST);
    });

    it('should generate a proof without throwing for a valid member', () => {
      expect(() => tree.generateProof(VALID_MEMBER)).not.toThrow();
    });

    it('should return a proof object with the correct structure', () => {
      const { leafHash, merklePath } = tree.generateProof(VALID_MEMBER);

      expect(leafHash).toBeDefined();
      expect(typeof leafHash).toBe('string');
      expect(leafHash.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars

      expect(merklePath).toBeDefined();
      expect(Array.isArray(merklePath)).toBe(true);
      expect(merklePath.length).toBeGreaterThan(0);
    });

    it('should return a leaf hash that is a valid SHA-256 hex string', () => {
      const { leafHash } = tree.generateProof(VALID_MEMBER);
      expect(/^[0-9a-f]{64}$/.test(leafHash)).toBe(true);
    });

    it('should return Merkle path nodes with valid structure', () => {
      const { merklePath } = tree.generateProof(VALID_MEMBER);
      for (const node of merklePath) {
        expect(node).toHaveProperty('sibling');
        expect(node).toHaveProperty('isRight');
        expect(typeof node.sibling).toBe('string');
        expect(node.sibling.length).toBe(64);
        expect(typeof node.isRight).toBe('boolean');
      }
    });

    it('PRIVACY: leaf hash should NOT contain the plaintext address', () => {
      const { leafHash } = tree.generateProof(VALID_MEMBER);
      const normalizedAddr = VALID_MEMBER.toLowerCase().replace('0x', '');
      expect(leafHash.toLowerCase()).not.toContain(normalizedAddr);
    });

    it('PRIVACY: proof JSON should NOT contain the plaintext address', () => {
      const proof = tree.generateProof(VALID_MEMBER);
      const proofJson = JSON.stringify(proof);
      const normalizedAddr = VALID_MEMBER.toLowerCase().replace('0x', '');
      expect(proofJson.toLowerCase()).not.toContain(normalizedAddr);
    });

    it('should generate different leaf hashes for different members', () => {
      const { leafHash: hash1 } = tree.generateProof(VALID_MEMBER);
      const { leafHash: hash2 } = tree.generateProof(ANOTHER_MEMBER);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate the same leaf hash for the same member (deterministic)', () => {
      const { leafHash: hash1 } = tree.generateProof(VALID_MEMBER);
      const { leafHash: hash2 } = tree.generateProof(VALID_MEMBER);
      expect(hash1).toBe(hash2);
    });

    it('should produce a valid proof that verifies against the root', () => {
      const root = tree.getRoot();
      const { leafHash, merklePath } = tree.generateProof(VALID_MEMBER);
      const isValid = tree.verifyProof(root, leafHash, merklePath);
      expect(isValid).toBe(true);
    });

    it('should work for all members in the allowlist', () => {
      const root = tree.getRoot();
      for (const member of ALLOWLIST) {
        const { leafHash, merklePath } = tree.generateProof(member);
        const isValid = tree.verifyProof(root, leafHash, merklePath);
        expect(isValid).toBe(true);
      }
    });
  });

  // ── Membership check ───────────────────────────────────────────────────────

  describe('isMember', () => {
    let tree: PrivateMerkleTree;

    beforeEach(() => {
      tree = new PrivateMerkleTree({ salt: SALT });
      tree.buildTree(ALLOWLIST);
    });

    it('should return true for a valid member', () => {
      expect(tree.isMember(VALID_MEMBER)).toBe(true);
    });

    it('should return false for a non-member', () => {
      expect(tree.isMember('0xdeadbeef00000000000000000000000000000001')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(tree.isMember(VALID_MEMBER.toUpperCase())).toBe(true);
    });
  });

  // ── State reporting ────────────────────────────────────────────────────────

  describe('getState', () => {
    it('should return state with leaf count matching allowlist size', () => {
      const tree = new PrivateMerkleTree({ salt: SALT });
      tree.buildTree(ALLOWLIST);
      const state = tree.getState();

      expect(state.leafCount).toBe(ALLOWLIST.length);
      expect(state.depth).toBeGreaterThan(0);
      expect(state.root.length).toBe(64);
      // Leaves are hashes only — no plaintext
      for (const leaf of state.leaves) {
        expect(/^[0-9a-f]{64}$/.test(leaf) || leaf === '0'.repeat(64)).toBe(true);
      }
    });
  });

  // ── Salt independence ──────────────────────────────────────────────────────

  describe('salt independence', () => {
    it('should produce different roots for the same allowlist but different salts', () => {
      const tree1 = new PrivateMerkleTree({ salt: 'salt-alpha' });
      const tree2 = new PrivateMerkleTree({ salt: 'salt-beta' });
      tree1.buildTree(ALLOWLIST);
      tree2.buildTree(ALLOWLIST);
      expect(tree1.getRoot()).not.toBe(tree2.getRoot());
    });

    it('should make leaf hashes unguessable across different tree instances with different salts', () => {
      const tree1 = new PrivateMerkleTree({ salt: 'salt-a' });
      const tree2 = new PrivateMerkleTree({ salt: 'salt-b' });
      tree1.buildTree(ALLOWLIST);
      tree2.buildTree(ALLOWLIST);

      const { leafHash: lh1 } = tree1.generateProof(VALID_MEMBER);
      const { leafHash: lh2 } = tree2.generateProof(VALID_MEMBER);

      // Different salts → different leaf hashes for the same address
      expect(lh1).not.toBe(lh2);
    });
  });
});
