import { Router } from 'express';
import { z } from 'zod';
import { InvestmentService } from '../services/InvestmentService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const investments = new InvestmentService();

router.post('/subscribe', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        offeringId: z.string().uuid(),
        investorWallet: z.string().min(1),
        /** Number of tokens to buy (max 3,000 = 10% of 30,000 supply) */
        tokenCount: z.number().int().min(1).max(3000),
      })
      .parse(req.body);

    const result = await investments.subscribe(
      body.offeringId,
      body.investorWallet,
      body.tokenCount
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/subscriptions/:offeringId', async (req, res, next) => {
  try {
    const subs = await investments.listSubscriptions(req.params.offeringId);
    res.json({ subscriptions: subs });
  } catch (err) {
    next(err);
  }
});

export default router;
