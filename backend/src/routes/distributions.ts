import { Router } from 'express';
import { z } from 'zod';
import { DistributionService } from '../services/DistributionService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const distributions = new DistributionService();

router.get('/', async (req, res, next) => {
  try {
    const tokenId = req.query.tokenId as string | undefined;
    const list = await distributions.list(tokenId);
    res.json({ distributions: list });
  } catch (err) {
    next(err);
  }
});

router.post('/preview', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        tokenId: z.string().uuid(),
        grossRentUsdcMicro: z.string().regex(/^[0-9]+$/),
      })
      .parse(req.body);
    const preview = await distributions.previewMonthly(
      body.tokenId,
      body.grossRentUsdcMicro
    );
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

router.post('/', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        tokenId: z.string().uuid(),
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        grossRentUsdcMicro: z.string().regex(/^[0-9]+$/),
        distributionDate: z.string().datetime(),
        userConfirmedEconomics: z.literal(true),
      })
      .parse(req.body);

    const distribution = await distributions.create(body);
    res.status(201).json({
      distribution,
      economicsNote: 'Confirm net income and waterfall with issuer before mainnet claims.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/claim', (_req, res) => {
  res.status(403).json({
    code: 'SMART_CONTRACT_REQUIRED',
    error: 'Merkle claims execute on-chain after income distribution contract deployment.',
  });
});

export default router;
