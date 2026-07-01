import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, username, password } = req.body as {
    email?: string;
    username?: string;
    password?: string;
  };

  if (!email || !username || !password) {
    res.status(400).json({ error: 'email, username, and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const [user] = await db
      .insert(users)
      .values({ email: email.toLowerCase(), username, passwordHash })
      .returning({ id: users.id, email: users.email, username: users.username, createdAt: users.createdAt });

    const accessToken = signAccessToken(user.id, user.email);
    const rawRefresh = crypto.randomBytes(40).toString('hex');

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    res.status(201).json({ user, accessToken, refreshToken: rawRefresh });
  } catch (err: unknown) {
    const pg = err as { code?: string; cause?: { code?: string } };
    const pgCode = pg.code ?? pg.cause?.code;
    if (pgCode === '23505') {
      res.status(409).json({ error: 'Email or username already taken' });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken(user.id, user.email);
  const rawRefresh = crypto.randomBytes(40).toString('hex');

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawRefresh),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, accessToken, refreshToken: rawRefresh });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  const tokenHash = hashToken(refreshToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  // Rotate: delete old token, issue new pair
  await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, stored.userId))
    .limit(1);

  const newAccessToken = signAccessToken(user.id, user.email);
  const newRawRefresh = crypto.randomBytes(40).toString('hex');

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(newRawRefresh),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRawRefresh });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (refreshToken) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
  }

  res.status(204).send();
}
