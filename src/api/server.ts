/**
 * server.ts — Express API server for the Private Allowlist dApp.
 */
import express from 'express';
import cors from 'cors';
import { router, apiErrorHandler } from './routes';
import config from '../utils/config';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

if (config.server.enableCors) {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'midnight-private-allowlist-api',
    version: '1.0.0',
    network: config.midnight.network,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api', router);

// ─── Error handling ───────────────────────────────────────────────────────────

app.use(apiErrorHandler);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = config.server.port;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🌙 Midnight Private Allowlist API`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🔍 Health check:    http://localhost:${PORT}/health`);
    console.log(`🌐 Network:         ${config.midnight.network}`);
    console.log(`📋 Contract:        ${config.midnight.contractAddress}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });
}

export default app;
