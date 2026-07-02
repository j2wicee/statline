import { Router, IRouter } from 'express';
import { createPick, getMyPicks } from '../controllers/picks.controller';
import { requireAuth } from '../middleware/auth';
const router: IRouter = Router();


router.post('/', requireAuth, createPick);
router.get('/me', requireAuth, getMyPicks);


export default router;