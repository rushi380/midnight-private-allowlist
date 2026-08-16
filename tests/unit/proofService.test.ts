/**
 * proofService.test.ts
 *
 * TEST 2: Invalid Member Proof Rejection
 * ──────────────────────────────────────
 * Verifies that the proof system correctly rejects non-members,
 * handles edge cases, and maintains the privacy contract.
 */
import { ProofService } from '../../src/services/proofService';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const VALID_MEMBER = ALLOWLIST[1];
const ANOTHER_VALID_MEMBER = ALLOWLIST[3];
const NON_MEMBER = '0xdeadbeef00000000000000000000000000001337';
const ANOTHER_NON_MEMBER = '0x0000000000000000000000000000000000000001';

const SERVICE_CONFIG = {
  nullifierSecret: 'test-nullifier-secret-12345',
  treeSalt: 'test-tree-salt-67890',
  expirySeconds: 300,
};

// ─── Test Suite: ProofService ─────────────────────────────────────────────────

describe('ProofService', () => {

  let proofService: ProofService;

  beforeEach(() => {
    proofService = new ProofService(SERVICE_CONFIG);
  });

  // ── Valid proof generation ─────────────────────────────────────────────────

  describe('generateProof — valid members', () => {
    it('should generate a proof for a valid member without throwing', () => {
      expect(() => proofService.generateProof(VALID_MEMBER, ALLOWLIST)).not.toThrow();
    });

    it('should return a ProofData object with all required fields', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);

      expect(proof).toHaveProperty('commitment');
      expect(proof).toHaveProperty('nullifier');
      expect(proof).toHaveProperty('merklePath');
      expect(proof).toHaveProperty('nonce');
      expect(proof).toHaveProperty('timestamp');
      expect(proof).toHaveProperty('merkleRoot');
      expect(proof).toHaveProperty('treeDepth');
    });

    it('should have a timestamp close to now', () => {
      const before = Date.now();
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const after = Date.now();

      expect(proof.timestamp).toBeGreaterThanOrEqual(before);
      expect(proof.timestamp).toBeLessThanOrEqual(after);
    });

    it('should have a 64-char hex commitment', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(/^[0-9a-f]{64}$/.test(proof.commitment)).toBe(true);
    });

    it('should have a 64-char hex nullifier', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(/^[0-9a-f]{64}$/.test(proof.nullifier)).toBe(true);
    });

    it('should have a 64-char hex nonce', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(/^[0-9a-f]{64}$/.test(proof.nonce)).toBe(true);
    });

    it('should generate a fresh nonce on every call (non-deterministic)', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      // Nonces should be randomly different
      expect(proof1.nonce).not.toBe(proof2.nonce);
    });

    it('should generate different commitments for the same user across calls (unlinkable)', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      // Commitments must differ (due to random nonce) — prevents linkability
      expect(proof1.commitment).not.toBe(proof2.commitment);
    });

    it('should generate the same nullifier for the same user (deterministic)', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      // Nullifiers are deterministic for replay prevention
      expect(proof1.nullifier).toBe(proof2.nullifier);
    });

    it('should generate different nullifiers for different users', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(ANOTHER_VALID_MEMBER, ALLOWLIST);
      expect(proof1.nullifier).not.toBe(proof2.nullifier);
    });
  });

  // ── TEST 2: Invalid member proof rejection ─────────────────────────────────

  describe('TEST 2 — should reject proof for non-whitelisted member', () => {
    it('should throw when generating a proof for a non-member', () => {
      expect(() =>
        proofService.generateProof(NON_MEMBER, ALLOWLIST)
      ).toThrow();
    });

    it('should throw with a meaningful error message for non-members', () => {
      expect(() =>
        proofService.generateProof(NON_MEMBER, ALLOWLIST)
      ).toThrow(/not in the allowlist/i);
    });

    it('should throw for a second non-member address', () => {
      expect(() =>
        proofService.generateProof(ANOTHER_NON_MEMBER, ALLOWLIST)
      ).toThrow();
    });

    it('should reject an empty address', () => {
      expect(() =>
        proofService.generateProof('', ALLOWLIST)
      ).toThrow('Address cannot be empty');
    });

    it('should reject when allowlist is empty', () => {
      expect(() =>
        proofService.generateProof(VALID_MEMBER, [])
      ).toThrow('Allowlist cannot be empty');
    });

    it('should reject null-like addresses', () => {
      expect(() =>
        proofService.generateProof('   ', ALLOWLIST)
      ).toThrow('Address cannot be empty');
    });

    it('should accept member even with mixed case address', () => {
      const mixedCase = VALID_MEMBER.replace('0x', '0x').toUpperCase();
      // Should work because the tree normalises to lowercase
      expect(() =>
        proofService.generateProof(mixedCase, ALLOWLIST)
      ).not.toThrow();
    });

    it('should still generate valid proof for remaining members after one rejection', () => {
      // Attempt non-member (should fail)
      expect(() =>
        proofService.generateProof(NON_MEMBER, ALLOWLIST)
      ).toThrow();

      // Other members should still work
      expect(() =>
        proofService.generateProof(VALID_MEMBER, ALLOWLIST)
      ).not.toThrow();
    });

    it('PRIVACY: error message for non-member should NOT contain their full address', () => {
      let errorMessage = '';
      try {
        proofService.generateProof(NON_MEMBER, ALLOWLIST);
      } catch (e) {
        errorMessage = (e as Error).message;
      }
      // Error should mask address (only partial is acceptable)
      const fullAddress = NON_MEMBER.toLowerCase().replace('0x', '');
      expect(errorMessage).not.toContain(fullAddress);
    });
  });

  // ── Proof freshness ────────────────────────────────────────────────────────

  describe('isProofFresh', () => {
    it('should return true for a freshly generated proof', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(proofService.isProofFresh(proof)).toBe(true);
    });

    it('should return false for an expired proof', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      // Manually age the proof
      const agedProof = { ...proof, timestamp: Date.now() - 400_000 }; // 400s ago
      expect(proofService.isProofFresh(agedProof)).toBe(false);
    });
  });

  // ── Static utilities ───────────────────────────────────────────────────────

  describe('ProofService static utilities', () => {
    it('haveSameNullifier should detect same user across two proofs', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(ProofService.haveSameNullifier(proof1, proof2)).toBe(true);
    });

    it('haveSameNullifier should return false for different users', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(ANOTHER_VALID_MEMBER, ALLOWLIST);
      expect(ProofService.haveSameNullifier(proof1, proof2)).toBe(false);
    });

    it('haveDistinctCommitments should be true for same user two proofs (random nonce)', () => {
      const proof1 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const proof2 = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      expect(ProofService.haveDistinctCommitments(proof1, proof2)).toBe(true);
    });

    it('publicFields should return only safe fields', () => {
      const proof = proofService.generateProof(VALID_MEMBER, ALLOWLIST);
      const pub = ProofService.publicFields(proof);

      expect(pub).toHaveProperty('commitment');
      expect(pub).toHaveProperty('nullifier');
      expect(pub).toHaveProperty('timestamp');
      expect(pub).toHaveProperty('merkleRoot');
      expect(pub).not.toHaveProperty('merklePath');
      expect(pub).not.toHaveProperty('nonce');
    });
  });
});
