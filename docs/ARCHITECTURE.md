# Architecture — Midnight Private Allowlist

## System Overview

The dApp operates across three layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRIVATE (User's Device)                        │
│  ┌──────────────┐   ┌─────────────────┐   ┌────────────────────┐  │
│  │ User Address │──▶│  ProofService   │──▶│    ProofData       │  │
│  │  (secret)    │   │ generateProof() │   │ (no address inside)│  │
│  └──────────────┘   └─────────────────┘   └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                    ProofData (safe to send)
                               │
┌─────────────────────────────────────────────────────────────────────┐
│                    SEMI-PUBLIC (API / Backend)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  VerificationService                          │  │
│  │  1. Structure check   2. Expiry check   3. Nullifier check   │  │
│  │  4. Root match        5. Merkle path verification            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                  VerificationResult { isValid }
                               │
┌─────────────────────────────────────────────────────────────────────┐
│                       PUBLIC (Blockchain)                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │            PrivateAllowlist.compact (on-chain)              │    │
│  │                                                             │    │
│  │  ledger merkle_root: Bytes<32>     ← public                │    │
│  │  ledger verification_count: Uint64 ← public                │    │
│  │  ledger used_nullifiers: Map<...>  ← public hashes only    │    │
│  │                                                             │    │
│  │  circuit verify_membership(        ← ZK verification       │    │
│  │    commitment, nullifier,          ← public inputs         │    │
│  │    leaf_hash, nonce, path          ← PRIVATE witnesses     │    │
│  │  ): Boolean                                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Merkle Tree Design

```
                     ROOT (on-chain)
                    /               \
               hash(01)           hash(23)
              /        \          /       \
          leaf[0]   leaf[1]  leaf[2]  leaf[3]

Where:
  leaf[i] = SHA-256(address[i] || LEAF_DOMAIN || salt)

The tree is PADDED to the nearest power of 2 with ZERO_LEAF.
This hides the actual list size from an observer.

Sorted pairs: SHA-256(min(a,b) || max(a,b))
This makes the Merkle path position-independent.
```

## Proof Construction

```
1. leafHash = SHA-256(address || LEAF_DOMAIN || salt)
   ↑ Private: address never stored or transmitted

2. merklePath = [sibling hashes from leaf to root]
   ↑ Private: contains only hashes, no addresses

3. nonce = random 32 bytes (fresh each call)
   ↑ Private: ensures commitment uniqueness

4. commitment = SHA-256(leafHash || nonce || COMMITMENT_DOMAIN)
   ↑ Public: binds proof to leaf without revealing it
     Two calls from same user → different commitments (unlinkable)

5. nullifier = SHA-256(leafHash || NULLIFIER_DOMAIN || secret)
   ↑ Public: prevents replay — same user → same nullifier
     But nullifier is a hash — cannot reveal the address
```

## Service Dependencies

```
MerkleTree
    ↑ used by
ProofService ─────────────────────────────────────────────────────────┐
    │                                                                   │
    │ ProofData                                                         │
    ▼                                                                   │
VerificationService ──────────────────────────────────────────────────┤
    │                                                                   │
    │ VerificationResult                                                │
    ▼                                                                   │
ContractService ───────────────────────────────────────────────────────┘
    │
    │ on-chain calls (Midnight SDK / simulated)
    ▼
PrivateAllowlist.compact
```

## Data Flow Summary

| Data | Stays Private? | Location |
|------|---------------|---------|
| User address | ✅ YES | User's device only |
| Leaf hash | ✅ YES | Computed locally, used in ZK |
| Merkle path | ✅ YES | Witness to ZK proof |
| Secret / salt | ✅ YES | .env file, never transmitted |
| Nonce | ✅ YES | Generated fresh, in ProofData (safe) |
| Commitment | 🌐 PUBLIC | Sent to contract |
| Nullifier | 🌐 PUBLIC | Sent to contract |
| Merkle root | 🌐 PUBLIC | Stored on-chain |
| Verification count | 🌐 PUBLIC | Stored on-chain |
