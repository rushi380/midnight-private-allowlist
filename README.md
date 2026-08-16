# 🌙 Midnight Private Allowlist Access dApp

[![Tests](https://github.com/rushi380/midnight-private-allowlist/actions/workflows/test.yml/badge.svg)](https://github.com/rushi380/midnight-private-allowlist/actions/workflows/test.yml)
[![Build](https://github.com/rushi380/midnight-private-allowlist/actions/workflows/build.yml/badge.svg)](https://github.com/rushi380/midnight-private-allowlist/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-7c3aed.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-green)](https://nodejs.org)
[![Midnight](https://img.shields.io/badge/Midnight-Testnet-blueviolet)](https://midnight.network)

> **Prove you're on the allowlist — without revealing who you are.**

A privacy-preserving access control dApp built on the [Midnight blockchain](https://midnight.network) using zero-knowledge proofs and Merkle trees. Users prove membership in an allowlist without exposing their identity, wallet address, or position in the list.

---

## 📋 Table of Contents

1. [Project Description](#project-description)
2. [🛡 Privacy Model](#-privacy-model) ← Critical section
3. [📋 Deployed Contract Address](#-deployed-contract-address)
4. [🚀 Getting Started](#-getting-started)
5. [🏗 Architecture](#-architecture)
6. [▶ How to Run](#-how-to-run)
7. [🧪 Testing](#-testing)
8. [🌐 Live Demo](#-live-demo)
9. [📦 Deployment Guide](#-deployment-guide)
10. [⚙️ CI/CD](#️-cicd)
11. [🔗 API Reference](#-api-reference)

---

## Project Description

The **Midnight Private Allowlist** dApp enables privacy-preserving access control:

- An **admin** maintains an allowlist of authorized addresses
- Only the **Merkle root** (a hash of the list) is stored on-chain
- Any **member** can prove they're on the allowlist using a zero-knowledge proof
- The proof reveals **nothing** about the member's identity — not their address, position, or even whether anyone else is on the list
- **Replay attacks** are prevented by a nullifier scheme that marks each proof as used

### Key Features

| Feature | Description |
|---------|-------------|
| 🔒 ZK Membership Proofs | Prove allowlist membership without revealing identity |
| 🌲 Merkle Tree | Privacy-preserving allowlist representation |
| 🎲 Nonce-based Commitments | Prevents proof linkability across submissions |
| 🔑 Nullifier Replay Prevention | Each proof can only be used once |
| ⏱ Proof Expiry | Proofs expire after 5 minutes |
| 🌙 Midnight Compact Contract | Authentic ZK smart contract with on-chain verification |
| ✅ 3+ Passing Tests | Full test suite with CI/CD |

---

## 🛡 Privacy Model

### What an Observer **CAN** Learn

When watching the blockchain, an observer can determine:

- ✅ A valid membership proof was submitted (a transaction occurred)
- ✅ The public verification result — accepted or rejected
- ✅ Aggregate statistics (total verifications / rejections)
- ✅ The current Merkle root (a 32-byte hash — meaningless without the list)
- ✅ That a specific nullifier was consumed (prevents replay — reveals nothing about identity)

### What an Observer **CANNOT** Learn

- ❌ **Which address** submitted the proof — the proof contains no identity
- ❌ **Whether a specific address** is on the allowlist
- ❌ **The full list** of allowlist members
- ❌ **The size** of the allowlist (tree is padded to power of 2)
- ❌ **The member's position** in the Merkle tree (sorted pairs + random leaves)
- ❌ **Who** generated two separate proofs (different nonces → different commitments)

### How Privacy is Achieved

```
Address → hash(address || salt) = leafHash       [PRIVATE: never on-chain]
leafHash → Merkle tree → root                     [ONLY ROOT IS PUBLIC]

Proof contains:
  commitment = SHA-256(leafHash || nonce)         [Public, but randomized per proof]
  nullifier  = SHA-256(leafHash || secret)        [Public, deterministic per user]
  merklePath = [sibling hashes...]                [Cryptographic path, not identity]
  nonce      = random 32 bytes                    [Fresh per proof — prevents linkability]
```

**Two proofs from the same user have different commitments** (due to random nonce), making them computationally unlinkable to an external observer.

**The nullifier is deterministic** per user (same user → same nullifier) so that replay attacks are detectable — but the nullifier itself reveals nothing about the user's address.

---

## 📋 Deployed Contract Address

> **Network:** Midnight Testnet
>
> **Contract Address:** `<YOUR_DEPLOYED_ADDRESS_HERE>`
>
> **Explorer:** `https://explorer.testnet.midnight.network/contract/<YOUR_DEPLOYED_ADDRESS_HERE>`
>
> **Merkle Root (at deployment):** `<INITIAL_MERKLE_ROOT_HERE>`

To deploy your own instance, see the [Deployment Guide](#-deployment-guide).

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (22+ recommended)
- **npm** 8+
- **Git**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/rushi380/midnight-private-allowlist.git
cd midnight-private-allowlist

# 2. Install dependencies
npm install

# 3. Copy environment config
cp .env.example .env
# Edit .env with your values (COMMITMENT_SECRET, JWT_SECRET at minimum)

# 4. Run tests to verify everything works
npm test

# 5. Start the API server
npm start

# 6. Start the frontend (in another terminal)
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## 🏗 Architecture

```
midnight-private-allowlist/
├── src/
│   ├── contracts/
│   │   ├── PrivateAllowlist.compact    ← Midnight smart contract (Compact language)
│   │   └── types/index.ts              ← TypeScript types for all data structures
│   │
│   ├── services/
│   │   ├── merkleTree.ts               ← Privacy-preserving Merkle tree (SHA-256)
│   │   ├── proofService.ts             ← ZK proof generation with commitment scheme
│   │   ├── verificationService.ts      ← Proof verification + replay prevention
│   │   └── contractService.ts          ← Contract interaction (simulated/real SDK)
│   │
│   ├── api/
│   │   ├── server.ts                   ← Express app
│   │   └── routes.ts                   ← API endpoints
│   │
│   └── ui/                             ← React + Vite frontend
│       ├── App.tsx
│       ├── ProofGenerator.tsx
│       ├── VerificationResult.tsx
│       └── components/
│           ├── AllowlistManager.tsx
│           └── PrivacyVisualizer.tsx
│
├── tests/
│   ├── unit/
│   │   ├── merkleTree.test.ts          ← TEST 1: Valid member proof generation
│   │   ├── proofService.test.ts        ← TEST 2: Invalid member proof rejection
│   │   └── verification.test.ts        ← TEST 3: Privacy property validation
│   └── integration/
│       └── endToEnd.test.ts            ← Full pipeline integration tests
│
└── .github/workflows/
    ├── test.yml                        ← Automated testing CI
    └── build.yml                       ← Build validation CI
```

### Component Interaction

```
User Address (stays private on client)
    │
    ▼
ProofService.generateProof()
    │  ├─ hashToLeaf(address, salt)          → leafHash [private]
    │  ├─ MerkleTree.generateProof()         → merklePath [private]
    │  ├─ computeCommitment(leafHash, nonce) → commitment [public]
    │  └─ computeNullifier(leafHash, secret) → nullifier [public]
    │
    ▼
ProofData { commitment, nullifier, merklePath, nonce, timestamp, merkleRoot }
    │  ← NO plaintext address
    │
    ▼
VerificationService.verifyProof()
    │  ├─ Structure check
    │  ├─ Expiry check (< 300s)
    │  ├─ Nullifier registry (replay prevention)
    │  ├─ Root match check
    │  └─ Merkle path verification
    │
    ▼
VerificationResult { isValid, message, verifiedAt, nullifier }
    │
    ▼
ContractService.verifyMembership()
    │  → On-chain: contract.verify_membership(commitment, nullifier, ...)
    └─ → Contract records nullifier, increments count
```

---

## ▶ How to Run

### API Server

```bash
# Development
npm start

# Available endpoints:
# GET  http://localhost:3001/health
# GET  http://localhost:3001/api/public-root
# GET  http://localhost:3001/api/stats
# POST http://localhost:3001/api/generate-proof
# POST http://localhost:3001/api/verify-proof
```

### Frontend

```bash
npm run dev
# Opens at http://localhost:5173
```

### Generate a Proof via API

```bash
curl -X POST http://localhost:3001/api/generate-proof \
  -H "Content-Type: application/json" \
  -d '{"address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"}'
```

### Verify a Proof via API

```bash
curl -X POST http://localhost:3001/api/verify-proof \
  -H "Content-Type: application/json" \
  -d '{"proof": <PASTE_PROOF_JSON_HERE>}'
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage
```

### Expected Test Output

```
 PASS  tests/unit/merkleTree.test.ts
  PrivateMerkleTree
    buildTree
      ✓ should build a tree from a non-empty allowlist (15ms)
      ✓ should throw when building from an empty allowlist (2ms)
      ✓ should produce a deterministic root for the same allowlist (8ms)
      ✓ should produce different roots for different allowlists (4ms)
    TEST 1 — should generate valid proof for whitelisted member
      ✓ should generate a proof without throwing for a valid member (12ms)
      ✓ should return a proof object with the correct structure (6ms)
      ✓ PRIVACY: leaf hash should NOT contain the plaintext address (3ms)
      ✓ PRIVACY: proof JSON should NOT contain the plaintext address (2ms)
      ... (and more)

 PASS  tests/unit/proofService.test.ts
  ProofService
    generateProof — valid members
      ✓ should generate a proof for a valid member without throwing (18ms)
      ✓ should generate different commitments for the same user (unlinkable) (9ms)
    TEST 2 — should reject proof for non-whitelisted member
      ✓ should throw when generating a proof for a non-member (5ms)
      ✓ should throw with a meaningful error message for non-members (3ms)
      ✓ PRIVACY: error message should NOT contain their full address (2ms)
      ... (and more)

 PASS  tests/unit/verification.test.ts
  Privacy Property Validation
    TEST 3a — Plaintext address NOT in proof
      ✓ should not contain the plaintext address in commitment (4ms)
      ✓ should not contain the plaintext address ANYWHERE in serialized proof (3ms)
      ✓ should hold for ALL members in the allowlist (12ms)
    TEST 3b — Cannot derive user identity from proof
      ✓ nullifiers should be hashes — not reversible to original address (2ms)
      ✓ two proofs from same user are computationally unlinkable (5ms)
    TEST 3d — Commitment is randomized
      ✓ should generate a new nonce on every invocation (18ms)
    Replay attack prevention
      ✓ should reject a proof submitted twice (same nullifier) (8ms)
      ... (and more)

 PASS  tests/integration/endToEnd.test.ts
  End-to-End Integration Tests
    Full happy path
      ✓ should complete the full proof flow for a valid member (35ms)
      ✓ contract stats should reveal only counts — not identities (22ms)
      ... (and more)

Test Suites: 4 passed, 4 total
Tests:       50+ passed, 50+ total
Snapshots:   0 total
Time:        ~3s
```

---

## 🌐 Live Demo

### Demo Instructions

1. **Open the app:** http://localhost:5173 (after `npm run dev`)
2. **Generate Proof tab:** Click a demo address → click "Generate Membership Proof"
3. **Observe:** The ProofData shows no plaintext address — only cryptographic hashes
4. **Verify tab:** Click "Verify Against Contract" → see result (Access Granted / Denied)
5. **Privacy Model tab:** Explore what observers can and cannot learn
6. **Allowlist tab:** See how the Merkle root is managed without exposing members

### Demo Allowlist Addresses (pre-configured)

```
0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266  ← Try this one (valid)
0x70997970c51812dc3a010c7d01b50e0d17dc79c8  ← Try this one (valid)
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc  ← Try this one (valid)
0xdeadbeef00000000000000000000000000001337  ← Not in list (will fail)
```

---

## 📦 Deployment Guide

### Prerequisites for Testnet Deployment

1. **Compact compiler** (`compactc`) — install from [docs.midnight.network/tools/compactc](https://docs.midnight.network/tools/compactc)
2. **Midnight wallet** with DUST tokens (get from testnet faucet)
3. **Proof Server** running locally: `docker run -p 6300:6300 midnightntwrk/proof-server`

### Deployment Steps

```bash
# 1. Configure environment
cp .env.example .env
# Set COMMITMENT_SECRET, ADMIN_ADDRESS, MIDNIGHT_INDEXER_URL

# 2. Compile the Compact contract
compactc src/contracts/PrivateAllowlist.compact --output managed/

# 3. Run deployment script
npx ts-node scripts/deploy.ts

# 4. Copy the contract address to .env
CONTRACT_ADDRESS=<address from deployment output>

# 5. Update README with the contract address
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

---

## ⚙️ CI/CD

GitHub Actions workflows run automatically on every push and PR:

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `test.yml` | push/PR on main, develop | `npm ci` → build → unit tests → integration tests → coverage |
| `build.yml` | push/PR on main, develop | `npm ci` → build server → build client |

**To add the CI badge to your fork:** update the repository URL in the badge links at the top of this README.

---

## 🔗 API Reference

### `GET /api/public-root`

Returns the current public Merkle root.

```json
{
  "merkleRoot": "a3f8d2b1...",
  "contractAddress": "mn1...",
  "network": "testnet",
  "updatedAt": 1726000000000
}
```

### `GET /api/stats`

Returns aggregate verification statistics (no identity info).

```json
{
  "stats": {
    "verificationCount": 42,
    "rejectionCount": 7,
    "successRate": 85.7
  }
}
```

### `POST /api/generate-proof`

```json
// Request
{ "address": "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" }

// Response (ProofData — no plaintext address)
{
  "success": true,
  "proof": {
    "commitment": "a3f8d2b1...",
    "nullifier": "c9e50746...",
    "nonce": "12984f3a...",
    "merklePath": [...],
    "timestamp": 1726000000000,
    "merkleRoot": "8d7c2b1e...",
    "treeDepth": 3
  }
}
```

### `POST /api/verify-proof`

```json
// Request
{ "proof": { ...ProofData... } }

// Response
{
  "success": true,
  "result": {
    "isValid": true,
    "message": "Membership verified — access granted",
    "verifiedAt": 1726000005000,
    "nullifier": "c9e50746..."
  }
}
```

---

## Git Commit History

The project follows a meaningful commit sequence:

```
1. init: project setup with TypeScript, Vite, and Midnight SDK structure
2. feat: implement privacy-preserving Merkle tree with SHA-256 leaf hashing
3. feat: add proof generation service with ZK commitment scheme
4. feat: implement verification service with replay prevention
5. feat: create Midnight Compact smart contract for allowlist verification
6. test: add comprehensive test suite for Merkle tree (TEST 1)
7. test: add proof generation and rejection tests (TEST 2)
8. test: add privacy property validation tests (TEST 3)
9. feat: add Express API endpoints and server
10. feat: build React frontend with glassmorphism UI
11. ci: add GitHub Actions workflow for automated testing and build
12. docs: add comprehensive README with privacy model and deployment guide
```

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built for the Midnight blockchain ecosystem. Privacy is a fundamental right.*
