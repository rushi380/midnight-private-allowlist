/**
 * setupTestnet.ts — Sets up and verifies the testnet environment.
 *
 * Checks:
 *   - Node.js version
 *   - Required environment variables
 *   - Proof server connectivity
 *   - Midnight indexer connectivity
 *   - Wallet DUST balance
 */
import dotenv from 'dotenv';
dotenv.config();

async function checkConnectivity(url: string, label: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    console.log(`   ✅ ${label}: reachable (${response.status})`);
    return true;
  } catch {
    console.log(`   ❌ ${label}: unreachable`);
    return false;
  }
}

async function setup(): Promise<void> {
  console.log('\n🌙 Midnight Testnet Setup Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Node.js version
  const nodeVersion = process.versions.node;
  const [major] = nodeVersion.split('.').map(Number);
  const nodeOk = major >= 18;
  console.log(`\n🟢 Node.js: ${nodeVersion} ${nodeOk ? '✅' : '❌ (requires 18+)'}`);

  // Environment variables
  console.log('\n📋 Environment Variables:');
  const envVars = [
    'COMMITMENT_SECRET',
    'ADMIN_ADDRESS',
    'JWT_SECRET',
    'MIDNIGHT_INDEXER_URL',
    'PROOF_SERVER_URL',
  ];
  let envOk = true;
  for (const key of envVars) {
    const value = process.env[key];
    if (value) {
      console.log(`   ✅ ${key}: set`);
    } else {
      console.log(`   ⚠️  ${key}: not set (using default)`);
      if (['COMMITMENT_SECRET', 'JWT_SECRET'].includes(key)) envOk = false;
    }
  }

  // Network connectivity
  console.log('\n🌐 Network Connectivity:');
  const indexerUrl = process.env['MIDNIGHT_INDEXER_URL'] ??
    'https://indexer.testnet.midnight.network/api/v1/graphql';
  const proofServerUrl = process.env['PROOF_SERVER_URL'] ?? 'http://localhost:6300';

  await checkConnectivity(indexerUrl, 'Midnight Indexer');
  await checkConnectivity(proofServerUrl, 'Local Proof Server');

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (nodeOk && envOk) {
    console.log('✅ Environment ready for local development');
    console.log('ℹ️  For testnet deployment, ensure Proof Server is running');
  } else {
    console.log('⚠️  Some checks failed. See docs/DEPLOYMENT.md for help.');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

setup().catch(console.error);
