/**
 * AUTH MIDDLEWARE
 *
 * Middleware is a function that sits between the incoming request and your
 * route handler. It can inspect the request, reject it, or let it through.
 *
 * requireAuth is a "guard" — it checks for a valid JWT access token on the
 * request and either:
 *   - Passes control to the next handler (request is authenticated)
 *   - Returns 401 Unauthorized (request is not authenticated)
 *
 * Usage on a route:
 *   router.get('/picks/me', requireAuth, picksController.getMyPicks)
 *                           ^^^^^^^^^^^
 *                           runs first; only reaches the controller if token is valid
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// The shape of the data we embed inside the JWT.
// When a token is verified, we decode this payload.
export interface AuthPayload {
  userId: string;
  email: string;
}

// Module augmentation: we're extending Express's built-in Request type
// to add a `user` property. This lets TypeScript know that `req.user`
// exists and has the AuthPayload shape when the middleware runs.
// Without this, TypeScript would error: "Property 'user' does not exist on Request"
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // The client sends the token in the Authorization header:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  //
  // "Bearer" is just a convention — it signals the token type.
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return; // stops execution — we do NOT call next()
  }

  // Slice off "Bearer " (7 characters) to get just the token string
  const token = header.slice(7);

  try {
    // jwt.verify() does three things in one call:
    //   1. Checks the signature: was this token signed with our JWT_ACCESS_SECRET?
    //      (If someone tampers with the payload, the signature won't match)
    //   2. Checks expiry: is this token past its 15-minute lifetime?
    //   3. Decodes the payload: gives us back { userId, email, iat, exp }
    //
    // If any of these fail, jwt.verify() THROWS — we catch it below.
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AuthPayload;

    // Attach the decoded user info to the request so route handlers can access it.
    // e.g. inside a controller: req.user.userId → the logged-in user's ID
    req.user = payload;

    // next() passes control to the next middleware or route handler in the chain.
    // This is the "let it through" path.
    next();
  } catch {
    // Token is invalid (bad signature) or expired.
    // Return 401 without any detail — don't tell attackers WHY it failed.
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
