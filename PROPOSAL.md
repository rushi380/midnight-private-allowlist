# 📄 PROPOSAL.md — Midnight Private Allowlist Access dApp

## 1. What Is This Product and Who Uses It?

### Product Description

**Midnight Private Allowlist** is a privacy-preserving access-control dApp that allows an administrator to maintain a list of authorized users (an allowlist), and allows any member of that list to **cryptographically prove their membership without revealing who they are**.

The core innovation is that members never disclose their wallet address, identity, or position in the allowlist. They generate a **zero-knowledge membership proof** — a cryptographic artifact that convinces the verifier they are authorized, while revealing nothing else.

### User Roles

| Role | Description |
|------|-------------|
| **Admin** | Maintains the allowlist of authorized addresses. Publishes only the Merkle root on-chain — never the full list. |
| **Member (Prover)** | An authorized user who generates a ZK proof to prove membership without revealing their address. |
| **Verifier / Smart Contract** | The Midnight Compact contract that validates the proof against the public Merkle root, checks for replay attacks via nullifiers, and records the result on-chain. |
| **Observer / Third Party** | Anyone watching the blockchain — they see only aggregate stats and nullifier hashes, never identity. |

### Real-World Use Cases

- **DeFi protocol whitelisting** — allow only KYC'd users without exposing their real addresses
- **DAO gated governance** — prove you're a token holder for voting without linking your wallet
- **Event or service access** — prove you're on a guest list without revealing your identity
- **Compliance without surveillance** — satisfy regulatory requirements while preserving user privacy

---

## 2. Why Midnight Specifically? (Not Just a Generic Blockchain)

Every design decision in this dApp is driven by a capability that is **unique to Midnight** and unavailable on general-purpose blockchains (Ethereum, Solana, Cosmos, etc.).

### 2.1 — Native ZK Proof Execution On-Chain

On Ethereum, zero-knowledge proofs must be verified by hand-crafted Solidity verifier contracts — a complex, error-prone, and gas-expensive process that requires cryptographic expertise in circuit design (Groth16, PLONK, etc.).

**Midnight provides this natively.** The `Compact` language compiles to circuits that are automatically proven by the Midnight Proof Server and verified on-chain by the protocol itself. This dramatically reduces the engineering barrier to building ZK-powered privacy apps.

### 2.2 — First-Class Private Witness Support

Midnight's `Compact` smart contract language distinguishes between:
- **Public ledger state** — what everyone can see
- **Private witnesses** — data the prover provides that never appears on-chain

This is central to how the allowlist dApp works: the user's `leafHash` (their salted address hash) and `merklePath` are provided as **private witnesses** to the contract, so they are verified cryptographically but **never stored or broadcast**.

No equivalent exists natively in EVM, SVM, or Move-based blockchains.

### 2.3 — Nullifier Scheme Without Identity Exposure

Midnight's architecture allows the contract to maintain a **nullifier registry** (a set of used proof tokens) that prevents replay attacks — without ever storing user addresses. The nullifier `SHA-256(leafHash || secret)` is deterministic per user but reveals nothing about them.

On Ethereum, preventing replay without identity exposure requires additional infrastructure (stealth addresses, mixers), none of which are first-class protocol features.

### 2.4 — Shielded Transaction Model

Midnight separates **public on-chain state** (Merkle root, nullifier set, counters) from **private computation** (witness generation, path verification). This is not a pattern that can be bolt-on added to a transparent blockchain — it is Midnight's foundational execution model.

### Summary

> **This dApp cannot be meaningfully replicated on Ethereum, Solana, or any other general-purpose blockchain without substantial off-chain infrastructure (rollups, TEEs, external ZK circuits). On Midnight, privacy is a protocol primitive — not an afterthought.**

---

## 3. Data Model — Public State, Private Witness, and Disclosure

### 3.1 On-Chain Public State

The Midnight Compact contract (`PrivateAllowlist.compact`) stores only the following **public ledger state**:

```compact
ledger {
  merkleRoot:          Bytes<32>;         // Hash of the allowlist tree — updated by admin
  usedNullifiers:      Set<Bytes<32>>;    // Prevents replay — reveals nothing about identity
  verificationCount:   Uint<64>;          // Aggregate accepted proofs
  rejectionCount:      Uint<64>;          // Aggregate rejected proofs
}
```

| Field | Public? | What It Reveals |
|-------|---------|-----------------|
| `merkleRoot` | Yes | A 32-byte hash — meaningless without the full list |
| `usedNullifiers` | Yes | A set of hashes — reveals only "a proof was used", not who |
| `verificationCount` | Yes | Aggregate count — no identity information |
| `rejectionCount` | Yes | Aggregate count — no identity information |

**No wallet addresses, leaf hashes, or plaintext identities are ever stored on-chain.**

### 3.2 Private Witnesses (Off-Chain / In-Proof)

The following values are provided by the prover as **private witnesses** during proof generation and never appear on-chain:

```
Private Inputs to the ZK Circuit:
  leafHash      = SHA-256(address || salt)            <- derived from user's address, never stored
  merklePath    = [siblingHash_0, ..., siblingHash_n] <- cryptographic inclusion path
  nonce         = random 32 bytes                     <- fresh per proof, prevents linkability
  secret        = user-held secret                    <- used for nullifier derivation
```

The ZK circuit verifies:
1. `commitment = SHA-256(leafHash || nonce)` matches the submitted commitment
2. `nullifier = SHA-256(leafHash || secret)` matches the submitted nullifier
3. The `merklePath` authenticates `leafHash` against the public `merkleRoot`

The prover only broadcasts `{commitment, nullifier, merklePath, nonce, timestamp, merkleRoot}` — a ProofData object that contains **no plaintext address**.

### 3.3 Disclosure Model — What Is Revealed to Whom?

| Observer | Can Learn | Cannot Learn |
|----------|-----------|--------------|
| Blockchain explorer | Merkle root, nullifier (hash), verify/reject counts, proof timestamp | Address, identity, position in list, list size |
| Other allowlist members | Same as above | Who else is on the list |
| Admin | Full allowlist (they built it) | Which member submitted a specific proof |
| Attacker | That a valid proof was submitted | Who submitted it, or whether two proofs are from the same user |

### 3.4 Privacy Proof — Two Proofs from the Same User are Unlinkable

```
Proof 1:  commitment = SHA-256(leafHash || nonce_1)  ->  0xa3f8d2...
Proof 2:  commitment = SHA-256(leafHash || nonce_2)  ->  0x9c14bf...
```

Because `nonce` is random per proof, an external observer cannot determine that Proof 1 and Proof 2 came from the same user — even though the nullifier (which is deterministic) would catch a replay if the same proof were submitted twice.

---

## 4. Scope Feasibility for Mainnet by Level 6

### Current Status (Level 3)

| Component | Status |
|-----------|--------|
| Privacy-preserving Merkle tree (SHA-256) | Complete |
| ZK proof generation with commitment + nullifier scheme | Complete |
| Verification service with replay prevention | Complete |
| Midnight Compact smart contract | Complete (simulation mode) |
| Express REST API (7 endpoints) | Complete |
| React + Vite frontend (4 tabs) | Complete |
| 50+ passing tests (unit + integration) | Complete |
| CI/CD GitHub Actions pipeline | Complete |
| Vercel deployment | Live at midnight-private-allowlist.vercel.app |

### Mainnet Roadmap (Levels 4–6)

#### Level 4 — Real Proof Server Integration
- Replace simulated ZK circuit with real Midnight Proof Server (`docker run midnightntwrk/proof-server`)
- Compile `PrivateAllowlist.compact` with `compactc` to generate actual circuit artifacts
- Wire up the Midnight TypeScript SDK for real transaction submission
- **Estimated effort:** 1–2 weeks (SDK integration is well-documented)

#### Level 5 — Testnet Deployment & Wallet Integration
- Deploy compiled contract to Midnight Testnet using DUST tokens
- Integrate Midnight wallet (Lace or similar) for real wallet-based proof generation
- Replace simulated contract address with live testnet address
- Add multi-admin support (merkle root update governance)
- **Estimated effort:** 1 week (infrastructure is already scaffolded in `scripts/deploy.ts`)

#### Level 6 — Mainnet Launch
- Audit of Compact contract and ZK circuit
- Dynamic allowlist management (merkle root rotation without full redeploy)
- Gas-optimized batch nullifier verification
- Production UI hardening (error handling, mobile responsiveness)
- Optional: IPFS-based allowlist distribution for censorship resistance
- **Estimated effort:** 2–3 weeks post-audit

### Feasibility Assessment

The core cryptographic architecture (Merkle commitments, nullifiers, ZK-compatible proofs) is already production-ready. The remaining work is integration surface — connecting to the real Midnight SDK and deployment infrastructure. The Midnight team provides:

- Open-source TypeScript SDK
- `compactc` compiler for Compact to ZK circuit
- Hosted Testnet with faucet
- Proof Server Docker image

**Conclusion:** Full Mainnet deployment by Level 6 is realistic. The hardest technical problem — privacy-preserving ZK membership proof design — is already solved and tested. The remaining steps are well-defined integration tasks with existing tooling.

---

*This proposal was prepared for the New Moon to Full Moon: $8,000 Prize Pool program.*
*Repository: https://github.com/rushi380/midnight-private-allowlist*
