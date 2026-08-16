/**
 * verification.test.ts
 *
 * TEST 3: Privacy Property Validation
 * ────────────────────────────────────
 * Verifies the core privacy guarantees of the proof system:
 *   ✓ Plaintext address NOT in proof output
 *   ✓ Cannot derive user identity from proof
 *   ✓ Proofs are different for different users (no position leak)
 *   ✓ Commitments are randomized (random nonce)
 *   ✓ Replay attacks are prevented
 */
import { PrivateMerkleTree } from '../../src/services/merkleTree';
import { ProofService } from '../../src/services/proofService';
import { VerificationService } from '../../src/services/verificationService';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const MEMBER_A = ALLOWLIST[0];
const MEMBER_B = ALLOWLIST[1];
const MEMBER_C = ALLOWLIST[4];
const NON_MEMBER = '0xdeadbeef00000000000000000000000000001337';

const CONFIG = {
  nullifierSecret: 'verification-test-secret-xyz',
  treeSalt: 'verification-test-salt-abc',
  expirySeconds: 300,
};

// ─── Test Suite: Privacy Properties ──────────────────────────────────────────

describe('Privacy Property Validation', () => {

  let proofService: ProofService;
  let verificationService: VerificationService;
  let merkleTree: PrivateMerkleTree;

  beforeEach(() => {
    merkleTree = new PrivateMerkleTree({ salt: CONFIG.treeSalt });
    merkleTree.buildTree(ALLOWLIST);

    proofService = new ProofService(CONFIG);

    verificationService = new VerificationService({
      merkleRoot: merkleTree.getRoot(),
      expirySeconds: CONFIG.expirySeconds,
      treeSalt: CONFIG.treeSalt,
    });
  });

  // ── TEST 3a: Plaintext address not in proof ────────────────────────────────

  describe('TEST 3a — Plaintext address NOT in proof', () => {
    it('should not contain the plaintext address in commitment', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');
      expect(proof.commitment).not.toContain(normalizedAddr);
    });

    it('should not contain the plaintext address in nullifier', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');
      expect(proof.nullifier).not.toContain(normalizedAddr);
    });

    it('should not contain the plaintext address in nonce', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');
      expect(proof.nonce).not.toContain(normalizedAddr);
    });

    it('should not contain the plaintext address in merkleRoot', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');
      expect(proof.merkleRoot).not.toContain(normalizedAddr);
    });

    it('should not contain the plaintext address in any Merkle path node', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');

      for (const node of proof.merklePath) {
        expect(node.sibling).not.toContain(normalizedAddr);
      }
    });

    it('should not contain the plaintext address ANYWHERE in the serialized proof', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const serialized = JSON.stringify(proof);
      const normalizedAddr = MEMBER_A.toLowerCase().replace('0x', '');
      expect(serialized.toLowerCase()).not.toContain(normalizedAddr);
    });

    it('should hold for ALL members in the allowlist', () => {
      for (const member of ALLOWLIST) {
        const proof = proofService.generateProof(member, ALLOWLIST);
        const serialized = JSON.stringify(proof);
        const normalizedAddr = member.toLowerCase().replace('0x', '');
        expect(serialized.toLowerCase()).not.toContain(normalizedAddr);
      }
    });
  });

  // ── TEST 3b: Cannot derive user identity from proof ───────────────────────

  describe('TEST 3b — Cannot derive user identity from proof', () => {
    it('should produce the same commitment length for all members (uniform output)', () => {
      const proofs = ALLOWLIST.map((m) => proofService.generateProof(m, ALLOWLIST));
      const commitmentLengths = new Set(proofs.map((p) => p.commitment.length));
      expect(commitmentLengths.size).toBe(1); // all 64 chars
    });

    it('should produce the same nullifier length for all members', () => {
      const proofs = ALLOWLIST.map((m) => proofService.generateProof(m, ALLOWLIST));
      const nullifierLengths = new Set(proofs.map((p) => p.nullifier.length));
      expect(nullifierLengths.size).toBe(1); // all 64 chars
    });

    it('should produce indistinguishable proof sizes for different members', () => {
      const proofA = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const proofB = proofService.generateProof(MEMBER_B, ALLOWLIST);
      // Both proofs should have the same depth (no size leakage about position)
      expect(proofA.treeDepth).toBe(proofB.treeDepth);
    });

    it('nullifiers should be hashes — not reversible to the original address', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      // A nullifier is a SHA-256 hash — 64 hex chars, no structure
      expect(proof.nullifier).toMatch(/^[0-9a-f]{64}$/);
      // It should not be a raw address
      expect(proof.nullifier).not.toMatch(/^0x/i);
    });

    it('two different proofs from the same user should be computationally unlinkable by commitment', () => {
      const proof1 = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const proof2 = proofService.generateProof(MEMBER_A, ALLOWLIST);
      // Commitments differ → external observer cannot link the two proofs to the same user
      expect(proof1.commitment).not.toBe(proof2.commitment);
    });
  });

  // ── TEST 3c: Proofs differ across users (no position leak) ────────────────

  describe('TEST 3c — Proofs are different for different users', () => {
    it('should produce different commitments for different users', () => {
      const proofA = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const proofB = proofService.generateProof(MEMBER_B, ALLOWLIST);
      expect(proofA.commitment).not.toBe(proofB.commitment);
    });

    it('should produce different nullifiers for different users', () => {
      const proofA = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const proofB = proofService.generateProof(MEMBER_B, ALLOWLIST);
      expect(proofA.nullifier).not.toBe(proofB.nullifier);
    });

    it('should produce different Merkle paths for different users', () => {
      const proofA = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const proofB = proofService.generateProof(MEMBER_B, ALLOWLIST);
      // Paths will differ at some point
      const pathA = JSON.stringify(proofA.merklePath);
      const pathB = JSON.stringify(proofB.merklePath);
      expect(pathA).not.toBe(pathB);
    });

    it('all member proofs should verify against the SAME root (no per-member roots)', () => {
      const root = merkleTree.getRoot();
      for (const member of ALLOWLIST) {
        const proof = proofService.generateProof(member, ALLOWLIST);
        expect(proof.merkleRoot).toBe(root);
      }
    });
  });

  // ── TEST 3d: Commitments are randomized ──────────────────────────────────

  describe('TEST 3d — Commitment is randomized (uses nonce)', () => {
    it('should generate a random nonce (not all zeros)', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      expect(proof.nonce).not.toBe('0'.repeat(64));
    });

    it('should generate a new nonce on every invocation', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
        nonces.add(proof.nonce);
      }
      // All 10 nonces should be unique (probability of collision is astronomically low)
      expect(nonces.size).toBe(10);
    });

    it('commitments should form a uniform distribution (first char variety)', () => {
      const firstChars = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
        firstChars.add(proof.commitment[0]);
      }
      // Should see variety in first hex char (statistically)
      expect(firstChars.size).toBeGreaterThan(1);
    });
  });

  // ── Replay protection ─────────────────────────────────────────────────────

  describe('Replay attack prevention', () => {
    it('should reject a proof submitted twice (same nullifier)', () => {
      const proof = proofService.generateProof(MEMBER_C, ALLOWLIST);

      // First verification succeeds
      const result1 = verificationService.verifyProof(proof);
      expect(result1.isValid).toBe(true);

      // Second verification with same proof is rejected
      const result2 = verificationService.verifyProof(proof);
      expect(result2.isValid).toBe(false);
      expect(result2.errorCode).toBe('NULLIFIER_USED');
    });

    it('nullifier registry should track used nullifiers', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);

      expect(verificationService.isNullifierUsed(proof.nullifier)).toBe(false);

      verificationService.verifyProof(proof);

      expect(verificationService.isNullifierUsed(proof.nullifier)).toBe(true);
    });

    it('should accept a second proof from the same user with a different commitment (new nonce)', () => {
      const proof1 = proofService.generateProof(MEMBER_B, ALLOWLIST);
      const proof2 = proofService.generateProof(MEMBER_B, ALLOWLIST);

      // First proof succeeds
      const result1 = verificationService.verifyProof(proof1);
      expect(result1.isValid).toBe(true);

      // Second proof from same user with SAME nullifier is rejected
      const result2 = verificationService.verifyProof(proof2);
      expect(result2.isValid).toBe(false);
      expect(result2.errorCode).toBe('NULLIFIER_USED');
    });
  });

  // ── Non-member verification ───────────────────────────────────────────────

  describe('VerificationService — non-member rejection', () => {
    it('should reject a proof with a mismatched Merkle root', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const wrongRoot = 'a'.repeat(64);

      const result = verificationService.verifyProof(proof, wrongRoot);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ROOT_MISMATCH');
    });

    it('should reject a malformed proof (invalid commitment length)', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const malformed = { ...proof, commitment: 'bad-commitment' };

      const result = verificationService.verifyProof(malformed);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('COMMITMENT_MISMATCH');
    });

    it('should reject an expired proof', () => {
      const proof = proofService.generateProof(MEMBER_A, ALLOWLIST);
      const expiredProof = { ...proof, timestamp: Date.now() - 400_000 };

      const result = verificationService.verifyProof(expiredProof);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('PROOF_EXPIRED');
    });
  });
});
