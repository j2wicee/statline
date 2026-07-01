/**
 * AUTH ROUTES
 *
 * A Router is a mini Express app — it groups related routes together.
 * This router handles everything under /api/auth/* (the /api/auth prefix
 * is added when this router is mounted in routes/index.ts).
 *
 * Separation of concerns:
 *   - Routes (this file): define WHAT URLs exist and WHICH controller handles them
 *   - Controllers (auth.controller.ts): define WHAT HAPPENS when a URL is hit
 *
 * Keeping these separate makes the code easier to navigate. If you want to know
 * "what endpoints exist?", look here. If you want to know "what does login do?",
 * look at the controller.
 */

import { Router, IRouter } from 'express';
import { register, login, refresh, logout } from '../controllers/auth.controller';

// IRouter is the explicit TypeScript type for Router.
// We need it here because of a TypeScript quirk with pnpm's module resolution
// that causes an error if the type is inferred. Explicitly annotating avoids it.
const router: IRouter = Router();

// Each line maps an HTTP method + path to a controller function.
//   POST /api/auth/register → register()
//   POST /api/auth/login    → login()
//   POST /api/auth/refresh  → refresh()
//   POST /api/auth/logout   → logout()
router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   logout);

export default router;
