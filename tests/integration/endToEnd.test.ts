/**
 * endToEnd.test.ts — Integration tests for the full proof pipeline.
 *
 * Tests the complete flow:
 *   allowlist → Merkle tree → proof generation → verification → contract
 *
 * Validates that all components work together correctly and that
 * privacy guarantees hold end-to-end.
 */
import { PrivateMerkleTree } from '../../src/services/merkleTree';
import { ProofService } from '../../src/services/proofService';
import { VerificationService } from '../../src/services/verificationService';
import { ContractService } from '../../src/services/contractService';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const E2E_CONFIG = {
  nullifierSecret: 'e2e-integration-test-secret',
  treeSalt: 'e2e-integration-test-salt',
  expirySeconds: 300,
};

// ─── Integration Test Suite ───────────────────────────────────────────────────

describe('End-to-End Integration Tests', () => {

  let merkleTree: PrivateMerkleTree;
  let proofService: ProofService;
  let verificationService: VerificationService;
  let contractService: ContractService;

  beforeEach(async () => {
    // 1. Build the Merkle tree
    merkleTree = new PrivateMerkleTree({ salt: E2E_CONFIG.treeSalt });
    merkleTree.buildTree(ALLOWLIST);

    // 2. Init services
    proofService = new ProofService(E2E_CONFIG);
    verificationService = new VerificationService({
      merkleRoot: merkleTree.getRoot(),
      expirySeconds: E2E_CONFIG.expirySeconds,
      treeSalt: E2E_CONFIG.treeSalt,
    });

    // 3. Init contract (simulated)
    contractService = new ContractService({
      simulate: true,
      adminSecret: E2E_CONFIG.nullifierSecret,
    });

    // 4. Deploy (simulated)
    await contractService.deployContract(ALLOWLIST, E2E_CONFIG.treeSalt);
  });

  // ── Full happy path ────────────────────────────────────────────────────────

  describe('Full happy path — member access flow', () => {
    it('should complete the full proof flow for a valid member', async () => {
      const member = ALLOWLIST[0];

      // Step 1: Generate proof (off-chain)
      const proof = proofService.generateProof(member, ALLOWLIST);
      expect(proof).toBeDefined();

      // Step 2: Verify proof locally
      const verifyResult = verificationService.verifyProof(proof);
      expect(verifyResult.isValid).toBe(true);

      // Step 3: Submit to contract (simulated on-chain verification)
      const contractResult = await contractService.verifyMembership(proof);
      expect(contractResult).toBe(true);
    });

    it('should update contract stats after a successful verification', async () => {
      const member = ALLOWLIST[1];
      const proof = proofService.generateProof(member, ALLOWLIST);

      const statsBefore = await contractService.getStats();
      await contractService.verifyMembership(proof);
      const statsAfter = await contractService.getStats();

      expect(statsAfter.verificationCount).toBe(statsBefore.verificationCount + 1);
    });

    it('should allow different members to generate independent proofs', async () => {
      const results = await Promise.all(
        ALLOWLIST.slice(0, 3).map(async (member) => {
          const proof = proofService.generateProof(member, ALLOWLIST);
          const verified = verificationService.verifyProof(proof);
          return { member: member.slice(0, 8) + '...', isValid: verified.isValid };
        })
      );

      expect(results.every((r) => r.isValid)).toBe(true);
    });
  });

  // ── Non-member rejection flow ──────────────────────────────────────────────

  describe('Non-member rejection flow', () => {
    it('should reject a non-member at proof generation stage', async () => {
      const nonMember = '0xdeadbeef00000000000000000000000000001337';

      expect(() =>
        proofService.generateProof(nonMember, ALLOWLIST)
      ).toThrow();
    });

    it('should reject a tampered proof at verification stage', async () => {
      const member = ALLOWLIST[0];
      const proof = proofService.generateProof(member, ALLOWLIST);

      // Tamper with the merkleRoot — the verifier checks this against the known root
      const tamperedProof = {
        ...proof,
        merkleRoot: 'f'.repeat(64), // wrong root — detectable by verifier
      };

      const result = verificationService.verifyProof(tamperedProof);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ROOT_MISMATCH');
    });

    it('should reject a proof with wrong Merkle root', async () => {
      const member = ALLOWLIST[0];
      const proof = proofService.generateProof(member, ALLOWLIST);

      // Verify against wrong root
      const wrongRoot = 'b'.repeat(64);
      const result = verificationService.verifyProof(proof, wrongRoot);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ROOT_MISMATCH');
    });
  });

  // ── Allowlist update flow ──────────────────────────────────────────────────

  describe('Allowlist update flow', () => {
    it('should invalidate old proofs after allowlist update', async () => {
      const member = ALLOWLIST[0];

      // Generate proof against old allowlist
      const oldProof = proofService.generateProof(member, ALLOWLIST);
      expect(verificationService.verifyProof(oldProof).isValid).toBe(true);

      // Update allowlist (remove one member, add new one)
      const newAllowlist = [
        ...ALLOWLIST.slice(1), // Remove first member
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Add new member
      ];
      const newTree = new PrivateMerkleTree({ salt: E2E_CONFIG.treeSalt });
      newTree.buildTree(newAllowlist);

      // Update verification service with new root
      const newVerificationService = new VerificationService({
        merkleRoot: newTree.getRoot(),
        expirySeconds: E2E_CONFIG.expirySeconds,
        treeSalt: E2E_CONFIG.treeSalt,
      });

      // Old proof should fail against new root
      const result = newVerificationService.verifyProof(oldProof);
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('ROOT_MISMATCH');
    });
  });

  // ── Privacy integration ────────────────────────────────────────────────────

  describe('Privacy integration — end-to-end', () => {
    it('no member address should appear in ANY proof across all members', () => {
      for (const member of ALLOWLIST) {
        const proof = proofService.generateProof(member, ALLOWLIST);
        const serialized = JSON.stringify(proof);
        const normalizedAddr = member.toLowerCase().replace('0x', '');
        expect(serialized).not.toContain(normalizedAddr);
      }
    });

    it('all proofs should have the same public root (linkage through root only)', () => {
      const root = merkleTree.getRoot();
      for (const member of ALLOWLIST) {
        const proof = proofService.generateProof(member, ALLOWLIST);
        expect(proof.merkleRoot).toBe(root);
      }
    });

    it('contract stats should reveal only counts — not identities', async () => {
      // Verify multiple members
      for (const member of ALLOWLIST.slice(0, 2)) {
        const proof = proofService.generateProof(member, ALLOWLIST);
        await contractService.verifyMembership(proof);
      }

      const stats = await contractService.getStats();

      // Stats should only have counts, no addresses
      const statsJson = JSON.stringify(stats);
      for (const member of ALLOWLIST) {
        const normalizedAddr = member.toLowerCase().replace('0x', '');
        expect(statsJson).not.toContain(normalizedAddr);
      }
    });

    it('merkle root should be deterministic for the same allowlist', () => {
      const tree1 = new PrivateMerkleTree({ salt: E2E_CONFIG.treeSalt });
      const tree2 = new PrivateMerkleTree({ salt: E2E_CONFIG.treeSalt });
      tree1.buildTree(ALLOWLIST);
      tree2.buildTree(ALLOWLIST);
      expect(tree1.getRoot()).toBe(tree2.getRoot());
    });
  });

  // ── Performance ────────────────────────────────────────────────────────────

  describe('Performance', () => {
    it('should generate a proof in under 500ms', () => {
      const start = Date.now();
      proofService.generateProof(ALLOWLIST[0], ALLOWLIST);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('should verify a proof in under 100ms', () => {
      const proof = proofService.generateProof(ALLOWLIST[0], ALLOWLIST);
      const start = Date.now();
      verificationService.verifyProof(proof);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});
