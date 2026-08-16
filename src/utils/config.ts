/**
 * config.ts — Runtime configuration loaded from environment variables.
 *
 * All Midnight network configuration is centralised here so that tests
 * can override it without touching process.env directly.
 */
import dotenv from 'dotenv';
import {
  DEFAULT_TREE_DEPTH,
  MIDNIGHT_TESTNET_INDEXER,
  MIDNIGHT_TESTNET_INDEXER_WS,
  MIDNIGHT_PROOF_SERVER,
  PROOF_EXPIRY_SECONDS,
  CONTRACT_ADDRESS_PLACEHOLDER,
} from './constants';

dotenv.config();

export interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
    enableCors: boolean;
  };
  midnight: {
    indexerUrl: string;
    indexerWsUrl: string;
    proofServerUrl: string;
    contractAddress: string;
    network: string;
  };
  privacy: {
    proofExpirySeconds: number;
    commitmentSecret: string;
    treeDepth: number;
  };
  admin: {
    adminAddress: string;
    jwtSecret: string;
  };
}


export const config: AppConfig = {
  server: {
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    enableCors: process.env['ENABLE_CORS'] !== 'false',
  },
  midnight: {
    indexerUrl: process.env['MIDNIGHT_INDEXER_URL'] ?? MIDNIGHT_TESTNET_INDEXER,
    indexerWsUrl: process.env['MIDNIGHT_INDEXER_WS_URL'] ?? MIDNIGHT_TESTNET_INDEXER_WS,
    proofServerUrl: process.env['PROOF_SERVER_URL'] ?? MIDNIGHT_PROOF_SERVER,
    contractAddress: process.env['CONTRACT_ADDRESS'] ?? CONTRACT_ADDRESS_PLACEHOLDER,
    network: process.env['MIDNIGHT_NETWORK'] ?? 'testnet',
  },
  privacy: {
    proofExpirySeconds: parseInt(
      process.env['PROOF_EXPIRY_SECONDS'] ?? String(PROOF_EXPIRY_SECONDS),
      10
    ),
    commitmentSecret: process.env['COMMITMENT_SECRET'] ?? 'dev-secret-change-in-production',
    treeDepth: parseInt(process.env['TREE_DEPTH'] ?? String(DEFAULT_TREE_DEPTH), 10),
  },
  admin: {
    adminAddress: process.env['ADMIN_ADDRESS'] ?? '',
    jwtSecret: process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-in-production',
  },
};

export default config;
