/**
 * api/index.ts — Vercel Serverless Function entry point.
 *
 * Vercel requires the default export to be a plain (req, res) handler function.
 * We import the Express app and call it directly so Vercel recognises this
 * file as a valid Serverless Function.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import app from '../src/api/server';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  app(req, res);
}
