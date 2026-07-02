import { Router, IRouter } from 'express';
import { getProps } from '../controllers/props.controller';

const router: IRouter = Router();

router.get('/', getProps);

export default router;
