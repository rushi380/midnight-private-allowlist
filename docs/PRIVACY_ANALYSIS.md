# Privacy Analysis — Midnight Private Allowlist

## Formal Privacy Properties

### Property 1: Address Non-Disclosure (Zero Knowledge)

**Claim:** An observer who sees ProofData cannot determine the user's address.

**Argument:**
- `commitment = SHA-256(leafHash || nonce)` where `leafHash = SHA-256(address || salt)`
- SHA-256 is a one-way function; given commitment and nonce, leafHash cannot be recovered
- Given leafHash, the address cannot be recovered without knowing the salt
- The salt is a server-side secret never transmitted
- Therefore: commitment → address is computationally infeasible

**Security Assumption:** SHA-256 second pre-image resistance (widely accepted)

---

### Property 2: Proof Unlinkability (across submissions)

**Claim:** Two proofs from the same user cannot be linked by an observer.

**Argument:**
- Each proof call generates a fresh, random 32-byte nonce
- `commitment₁ = SHA-256(leafHash || nonce₁)` where nonce₁ is fresh
- `commitment₂ = SHA-256(leafHash || nonce₂)` where nonce₂ ≠ nonce₁
- Since nonce₁ ≠ nonce₂ (random), commitment₁ ≠ commitment₂ with overwhelming probability
- An observer sees (commitment₁, nullifier) and (commitment₂, nullifier)
- The commitments differ → observer cannot link them to same user by commitment
- The nullifiers are the same → user is detected by the nullifier scheme

**Implication:** Proof unlinkability holds unless the observer uses nullifier tracking.
The nullifier reveals "same user submitted twice" but not "which user".

---

### Property 3: Replay Prevention (Nullifier Soundness)

**Claim:** A proof cannot be replayed to gain access twice.

**Argument:**
- `nullifier = SHA-256(leafHash || NULLIFIER_DOMAIN || secret)`
- The nullifier is stored on-chain after first use
- Any subsequent proof with the same nullifier is rejected
- To compute a different nullifier for the same user, the attacker would need to know
  leafHash (which requires the address + salt), and secret (server-side)
- Therefore: the same proof cannot be reused, and a user cannot generate two distinct nullifiers
  without knowledge of the private secret

---

### Property 4: Membership Confidentiality (List Privacy)

**Claim:** An observer cannot determine if any specific address is on the allowlist.

**Argument:**
- Only the Merkle root is public: `root = MerkleTree.getRoot()`
- The root is `SHA-256(SHA-256(leaf[0]) || SHA-256(leaf[1]) || ...)`  (simplified)
- Given root and a candidate address `a`, to check if `a` is a member:
  - Compute `leafHash = SHA-256(a || salt)` — requires the salt (private)
  - Verify the Merkle path — requires knowing other leaf positions (private)
- Without the salt, an attacker cannot even compute the leaf hash for a target address
- Therefore: membership cannot be tested without the private salt

---

### Property 5: Size Confidentiality

**Claim:** An observer cannot determine the size of the allowlist.

**Argument:**
- The tree is always padded to the nearest power of 2 with `ZERO_LEAF = "000...0"`
- An allowlist of 3 members produces the same tree size as one with 4 members (both padded to 4)
- An observer sees only the root hash — a fixed 32-byte value regardless of list size
- The ZERO_LEAF values are indistinguishable from real leaves (same format)
- Therefore: list size is hidden up to powers of 2

**Limitation:** An observer can infer that the list has ≤ 2^depth members.
With depth=10, lists up to 1024 are indistinguishable.

---

## Threat Model

| Threat | Mitigation | Status |
|--------|-----------|--------|
| Address enumeration | Salt-based leaf hashing (SHA-256) | ✅ Protected |
| Proof replay | Nullifier registry on-chain | ✅ Protected |
| Proof linkability | Random nonce in commitment | ✅ Protected |
| List membership test | Private salt required | ✅ Protected |
| List size leakage | Power-of-2 padding | ✅ Protected (±1 bit) |
| Position leakage | Sorted pair hashing | ✅ Protected |
| Admin identity leakage | Admin stored as commitment hash | ✅ Protected |
| Expired proof reuse | Timestamp + 5-min expiry | ✅ Protected |

## Known Limitations

1. **Proof Server Trust:** In the real Midnight deployment, the Proof Server runs locally
   on the user's device. In the simulated mode, proof generation happens on the API server.
   For production, always use the local Proof Server to ensure the user's address never leaves their device.

2. **Salt Management:** The salt must remain secret and consistent. Rotating the salt
   invalidates all existing proofs and requires a new Merkle root.

3. **Admin Centralization:** The admin controls the Merkle root. A governance mechanism
   (multi-sig, DAO vote) should control root updates in production.

4. **Size Granularity:** List size is hidden only up to the nearest power of 2.
   An observer can infer the list has between 2^(depth-1)+1 and 2^depth members.
