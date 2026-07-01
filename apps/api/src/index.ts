/**
 * EXPRESS ENTRY POINT
 *
 * This is the first file Node.js runs. It:
 *   1. Loads environment variables from .env
 *   2. Creates the Express app
 *   3. Registers middleware (functions that run on every request)
 *   4. Mounts the route handlers
 *   5. Starts listening for HTTP connections
 */

// IMPORTANT: this must be the first import so DATABASE_URL, JWT secrets, etc.
// are loaded into process.env before any other module reads them.
// (db/index.ts reads DATABASE_URL at import time — if dotenv loads after,
// the pool would be created with an undefined connection string.)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ── MIDDLEWARE ──────────────────────────────────────────────────────────────
//
// Middleware are functions that run on EVERY request before your route handler.
// They're added in order with app.use() and can: transform the request,
// reject it early, or pass it along with next().

// CORS (Cross-Origin Resource Sharing):
// Browsers block JavaScript from making requests to a different domain by default.
// Our React frontend runs on localhost:5173 but talks to our API on localhost:3001.
// This middleware tells the browser it's allowed to do that.
// In production you'd set origin to your real frontend URL.
app.use(cors({ origin: 'http://localhost:5173' }));

// Parse incoming request bodies as JSON.
// Without this, req.body would be undefined when the client sends { email, password }.
app.use(express.json());

// ── ROUTES ──────────────────────────────────────────────────────────────────

// Simple health check — useful for uptime monitoring and deployment checks.
// curl http://localhost:3001/health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount all API routes under /api.
// Every route defined inside `router` will be prefixed with /api.
// e.g. POST /auth/register inside the router becomes POST /api/auth/register
app.use('/api', router);

// ── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
//
// Express recognizes this as an error handler because it takes 4 arguments (err, req, res, next).
// If any route handler throws an error (or calls next(err)), Express routes it here
// instead of crashing the process. This is a safety net for unexpected errors.
//
// Without this, an unhandled thrown error would crash the entire Node.js process
// and take down the server.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`StatLine API running on port ${PORT}`);
});
