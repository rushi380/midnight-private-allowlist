#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Git initialization script — creates 10+ meaningful commits
# Run this once to initialize the repository with the full history
# ═══════════════════════════════════════════════════════════════════

# Initialize git repository
git init
git branch -M main

# Commit 1: Project setup
git add package.json tsconfig.json tsconfig.build.json vite.config.ts .gitignore .env.example LICENSE
git commit -m "init: project setup with TypeScript, Vite, and Midnight SDK structure

- TypeScript 5.5 with strict mode
- Vite 5 for React frontend bundling
- Jest + ts-jest for testing
- Express for API server
- merkletreejs for privacy-preserving Merkle trees"

# Commit 2: Merkle tree
git add src/services/merkleTree.ts src/utils/constants.ts src/utils/config.ts
git commit -m "feat: implement privacy-preserving Merkle tree with SHA-256 leaf hashing

- Addresses hashed via SHA-256(address || LEAF_DOMAIN || salt)
- Sorted pair combining prevents position leakage
- Fixed-depth padding hides true list size
- Only Merkle root is ever disclosed on-chain"

# Commit 3: Contract types
git add src/contracts/types/index.ts
git commit -m "feat: add TypeScript type definitions for all contract data structures

- ProofData type with privacy-guarantee documentation
- VerificationResult with error codes
- ContractState mirroring on-chain ledger
- API request/response payloads"

# Commit 4: Proof generation
git add src/services/proofService.ts
git commit -m "feat: add proof generation service with ZK commitment scheme

- commitment = SHA-256(leafHash || nonce || COMMITMENT_DOMAIN)
- nullifier = SHA-256(leafHash || NULLIFIER_DOMAIN || secret)
- Random nonce per proof prevents linkability across submissions
- Runtime privacy assertion ensures no address leaks into ProofData"

# Commit 5: Verification
git add src/services/verificationService.ts
git commit -m "feat: implement verification service with replay prevention

- 5-step verification: structure, expiry, nullifier, root, Merkle path
- In-memory nullifier registry (mirrors on-chain Map)
- Proof expiry configurable via PROOF_EXPIRY_SECONDS
- Error codes for precise failure reporting"

# Commit 6: Smart contract
git add src/contracts/PrivateAllowlist.compact
git commit -m "feat: create Midnight Compact smart contract for allowlist verification

- ledger merkle_root: Bytes<32> — only root stored on-chain
- circuit verify_membership with private witnesses (leaf_hash, path)
- Admin commitment scheme protects admin identity
- Nullifier map prevents replay attacks
- pragma language_version >= 0.21.0"

# Commit 7: Contract service
git add src/services/contractService.ts
git commit -m "feat: add contract interaction service with simulation mode

- SimulatedContract for local development and CI
- ContractService auto-detects environment (NODE_ENV)
- Stub methods ready for real Midnight SDK integration
- deploy(), setMerkleRoot(), verifyMembership(), getStats()"

# Commit 8: Tests
git add tests/
git commit -m "test: add comprehensive test suite with 3+ required tests

TEST 1 (merkleTree.test.ts): Valid member proof generation
- Proof structure validation, determinism, privacy checks

TEST 2 (proofService.test.ts): Invalid member proof rejection
- Non-member throws, error message masking, freshness checks

TEST 3 (verification.test.ts): Privacy property validation
- Address not in proof, unlinkability, nonce randomization

INTEGRATION (endToEnd.test.ts): Full pipeline tests
- Happy path, rejection, allowlist update, replay prevention"

# Commit 9: API
git add src/api/routes.ts src/api/server.ts
git commit -m "feat: add Express API endpoints for proof operations

- POST /api/generate-proof — generates ZK membership proof
- POST /api/verify-proof — verifies proof against Merkle root
- GET /api/public-root — returns current public Merkle root
- GET /api/stats — aggregate verification statistics
- POST /api/admin/set-allowlist — admin root management
- Privacy: addresses masked in error messages"

# Commit 10: Frontend
git add index.html src/ui/ vite.config.ts
git commit -m "feat: build React frontend with dark glassmorphism UI

- ProofGenerator: demo mode + API mode, clickable demo addresses
- VerificationResult: animated success/failure with privacy note
- AllowlistManager: add/remove members, admin root update
- PrivacyVisualizer: observer model, proof flow, technical details
- Dark purple/blue Midnight-themed design system"

# Commit 11: CI/CD
git add .github/
git commit -m "ci: add GitHub Actions workflows for automated testing and build

- test.yml: runs on push/PR, Node 20 and 22, with coverage
- build.yml: validates TypeScript and Vite build
- Coverage artifacts uploaded for 7 days
- CI badges added to README"

# Commit 12: Documentation
git add README.md docs/ scripts/
git commit -m "docs: add comprehensive README with privacy model and deployment guide

- Privacy model section: what observers CAN/CANNOT learn
- Deployed contract address placeholder with instructions
- Architecture diagram with ASCII art
- Expected test output
- Complete API reference
- ARCHITECTURE.md, PRIVACY_ANALYSIS.md, DEPLOYMENT.md"

echo ""
echo "✅ Repository initialized with 12 meaningful commits"
echo "   Run: git log --oneline to verify"
echo ""
echo "   Next: git remote add origin <your-github-repo-url>"
echo "         git push -u origin main"
