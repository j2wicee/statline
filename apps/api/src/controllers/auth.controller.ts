/**
 * AUTH CONTROLLER
 *
 * Controllers contain the actual business logic for each route.
 * Each exported function maps to one HTTP endpoint.
 *
 * The auth system uses two tokens with different lifetimes:
 *
 *   ACCESS TOKEN (JWT, 15 minutes)
 *     - Sent with every API request in the Authorization header
 *     - Verified by checking its cryptographic signature (no DB lookup needed → fast)
 *     - Short-lived so a stolen token expires quickly
 *
 *   REFRESH TOKEN (random string, 7 days)
 *     - Stored in the database as a hash
 *     - Used only to get a new access token when the old one expires
 *     - Rotated on every use: old token is deleted, new pair is issued
 *     - If a stolen refresh token is used after rotation, it's rejected (it's been deleted)
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Node.js built-in — no install needed
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

// bcrypt "cost factor" — how many rounds of hashing to perform.
// 12 means 2^12 = 4096 rounds. Higher = slower to compute.
// This is intentional: it makes brute-force attacks impractical.
// On modern hardware, 12 rounds takes ~200ms — unnoticeable to a human,
// but devastating for an attacker trying millions of passwords.
const BCRYPT_ROUNDS = 12;

const ACCESS_TOKEN_TTL = '15m';                        // JWT expires in 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Signs a JWT containing the user's ID and email.
// jwt.sign() encodes the payload and signs it with our secret key.
// Anyone who has the token can READ the payload (it's base64 encoded, not encrypted).
// But they can't MODIFY it without invalidating the signature.
function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

// SHA-256 hashes the raw refresh token before storing it in the DB.
// WHY hash it? If the DB is breached, attackers get hashes, not working tokens.
// Unlike passwords, refresh tokens are random 40-byte strings — there's no
// dictionary attack possible, so fast SHA-256 is fine (bcrypt's slowness
// is only needed when the input could be a dictionary word).
function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── REGISTER ────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password?: string;
  };

  // Validate input before touching the DB.
  // Return early with 400 Bad Request if anything is missing or invalid.
  if (!email || !username || !password) {
    res.status(400).json({ error: 'email, username, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Hash the password BEFORE inserting into the DB.
  // We NEVER store the raw password.
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    // Insert the new user and return the created row.
    // We explicitly select which columns to return — we never return passwordHash.
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), username, passwordHash })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      });

    // Issue an access token immediately after registration so the user
    // doesn't have to log in separately.
    const accessToken = signAccessToken(user.id, user.email);

    // Generate a cryptographically random refresh token (80 hex characters = 40 bytes).
    // crypto.randomBytes() uses the OS's secure random number generator.
    const rawRefresh = crypto.randomBytes(40).toString('hex');

    // Store the hash of the refresh token, not the raw token itself.
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    // Return the user (without password), access token, and raw refresh token.
    // The client should store the refresh token securely (e.g. httpOnly cookie or secure storage).
    res.status(201).json({ user, accessToken, refreshToken: rawRefresh });

  } catch (err: unknown) {
    // Drizzle wraps Postgres errors, so the PG error code is on err.cause.
    // Code '23505' = unique_violation (email or username already taken).
    const pg = err as { code?: string; cause?: { code?: string } };
    const pgCode = pg.code ?? pg.cause?.code;
    if (pgCode === '23505') {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }
    // Re-throw anything else so the global error handler in index.ts catches it.
    throw err;
  }
}

// ── LOGIN ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  // Look up the user by email.
  // .limit(1) tells Postgres to stop scanning after finding the first match
  // (the email column has a unique index so there's at most one result anyway).
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // SECURITY: both "user not found" and "wrong password" return the same
  // error message. If we returned different messages, an attacker could use
  // the login endpoint to discover which emails are registered (enumeration attack).
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // bcrypt.compare() hashes the submitted password using the same salt that
  // was used when the stored hash was created, then compares the results.
  // This is the only correct way to check a bcrypt password.
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const rawRefresh  = crypto.randomBytes(40).toString('hex');

  await db.insert(refreshTokens).values({
    userId:    user.id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  // Destructure out passwordHash so we never send it in the response.
  // The underscore prefix (_) is a convention for "intentionally unused variable".
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken: rawRefresh });
}

// ── REFRESH ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  // Hash the incoming token and look it up in the DB.
  // We never store the raw token, so this is the only way to find it.
  const tokenHash = hashToken(refreshToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  // Reject if: not found (never existed or already rotated) OR expired.
  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  // TOKEN ROTATION:
  // Delete the used token immediately. If someone stole the token and tries
  // to use it after the legitimate user has already refreshed, this deletion
  // means the stolen token is now gone — they get a 401.
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  // Look up the user to get their current email (it might have changed since the token was issued).
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1);

  // Issue a fresh pair of tokens.
  const newAccessToken  = signAccessToken(user.id, user.email);
  const newRawRefresh   = crypto.randomBytes(40).toString('hex');

  await db.insert(refreshTokens).values({
    userId:    user.id,
    tokenHash: hashToken(newRawRefresh),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRawRefresh });
}

// ── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  // Delete the refresh token from the DB so it can't be used again.
  // The client is responsible for discarding the access token locally.
  // (Access tokens can't be "revoked" server-side because they don't hit the DB —
  // they just expire after 15 minutes on their own.)
  if (refreshToken) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
  }

  // 204 No Content: success, nothing to return.
  res.status(204).send();
}
