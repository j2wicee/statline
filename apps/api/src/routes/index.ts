/**
 * ROUTE HUB
 *
 * This is the central router that all sub-routers plug into.
 * It's mounted at /api in index.ts, so every route here is prefixed with /api.
 *
 * As the app grows, new feature routers get added here:
 *   router.use('/auth',  authRouter);     → /api/auth/*
 *   router.use('/props', propsRouter);    → /api/props/*
 *   router.use('/picks', picksRouter);    → /api/picks/*
 */

import { Router, IRouter } from 'express';
import authRouter from './auth';
import propsRouter from './props'
import picksRouter from './picks'

const router: IRouter = Router();

router.use('/auth', authRouter);
router.use('/props', propsRouter);
router.use('/picks', picksRouter);

export default router;
