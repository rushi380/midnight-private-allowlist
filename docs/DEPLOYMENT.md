# Deployment Guide — Midnight Testnet

## Prerequisites

### 1. Install Midnight Toolchain

```bash
# Install the Compact compiler
# See: https://docs.midnight.network/tools/compactc
# Download the appropriate binary for your OS

# Verify installation
compactc --version
```

### 2. Install Docker (for Proof Server)

```bash
# Start the local Proof Server (required for ZK proof generation)
docker pull midnightntwrk/proof-server
docker run -d -p 6300:6300 --name proof-server midnightntwrk/proof-server

# Verify the Proof Server is running
curl http://localhost:6300/health
```

### 3. Get DUST Tokens (Testnet Faucet)

```
1. Go to: https://faucet.testnet.midnight.network
2. Enter your Midnight wallet address
3. Request testnet DUST tokens
4. Wait for transaction confirmation
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
COMMITMENT_SECRET=your_32_byte_secret_here_minimum_32_chars
ADMIN_ADDRESS=0xYourAdminAddress
JWT_SECRET=your_jwt_secret_here

# Midnight Testnet (default values are correct for testnet)
MIDNIGHT_INDEXER_URL=https://indexer.testnet.midnight.network/api/v1/graphql
MIDNIGHT_INDEXER_WS_URL=wss://indexer.testnet.midnight.network/api/v1/graphql/ws
PROOF_SERVER_URL=http://localhost:6300
```

---

## Deployment Steps

### Step 1: Compile the Contract

```bash
compactc src/contracts/PrivateAllowlist.compact \
  --output managed/ \
  --no-prove  # For compilation check only

# This generates:
# managed/index.d.ts    ← TypeScript bindings
# managed/index.cjs     ← Circuit WASM
# managed/*.zkir        ← ZK IR files
```

### Step 2: Run the Deployment Script

```bash
npx ts-node scripts/deploy.ts
```

The script will:
1. Build the initial Merkle tree from your allowlist
2. Compute the admin commitment (hash of your secret)
3. Deploy the contract to Midnight testnet
4. Print the contract address

**Expected output:**
```
🌙 Midnight Private Allowlist — Contract Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Building initial Merkle tree...
   Members:       3
   Merkle root:   a3f8d2b1c9e50746...
   Tree depth:    10

🚀 Deploying to Midnight Testnet...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ DEPLOYMENT SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Contract Address:  mn1a3f8d2b1c9e5074612984f3a8d7...
🌐 Network:           Midnight Testnet
🔍 Explorer:          https://explorer.testnet.midnight.network/contract/mn1...
🌿 Merkle Root:       a3f8d2b1c9e50746...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Update Configuration

```bash
# Add the contract address to .env
echo "CONTRACT_ADDRESS=mn1YOUR_CONTRACT_ADDRESS_HERE" >> .env

# Update README.md with the deployed address
sed -i 's/<YOUR_DEPLOYED_ADDRESS_HERE>/mn1YOUR_CONTRACT_ADDRESS_HERE/g' README.md
```

### Step 4: Verify Deployment

```bash
# Check contract state via API
curl http://localhost:3001/api/public-root

# Expected:
# { "merkleRoot": "a3f8d2b1...", "contractAddress": "mn1...", ... }
```

### Step 5: Verify on Explorer

Open the explorer URL printed by the deployment script:
```
https://explorer.testnet.midnight.network/contract/<YOUR_ADDRESS>
```

You should see:
- Contract state: `initialized = true`
- `merkle_root`: your initial root hash
- `verification_count`: 0
- `admin_commitment`: your admin hash

---

## Updating the Allowlist

When you need to add/remove members:

```bash
# 1. Edit the allowlist in scripts/deploy.ts or via the Admin UI
# 2. Rebuild the Merkle tree
# 3. Call set_merkle_root on the contract

# Via API (requires running server):
curl -X POST http://localhost:3001/api/admin/set-allowlist \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": ["0xabc...", "0xdef..."],
    "adminSecret": "YOUR_COMMITMENT_SECRET"
  }'
```

---

## Troubleshooting

| Error | Solution |
|-------|---------|
| `compactc not found` | Install Compact compiler from docs.midnight.network |
| `Proof Server unreachable` | Start Docker: `docker run -p 6300:6300 midnightntwrk/proof-server` |
| `Insufficient DUST` | Get tokens from testnet faucet |
| `Contract not initialized` | Run deployment script first |
| `COMMITMENT_SECRET not set` | Copy .env.example and fill values |

---

## Contract Verification

After deployment, your contract is automatically visible on the Midnight explorer.
The explorer shows:
- Contract bytecode hash
- Current ledger state (public fields only)
- Transaction history

No additional verification step is required (unlike EVM chains).
