import express from 'express';
import authRouter from './auth.js';
import onboardingRouter from "./onboard.js"
import authenticate from '../middlewares/authenticate.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/onboarding', authenticate, onboardingRouter)

export default router;


