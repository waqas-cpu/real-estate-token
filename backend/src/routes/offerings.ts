import { Router } from 'express';
import { z } from 'zod';
import { OfferingService } from '../services/OfferingService.js';
import { TokenEconomicsGuardError } from '../services/TokenEconomicsService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const offerings = new OfferingService();

router.get('/', async (req, res, next) => {
  try {
    const tokenId = req.query.tokenId as string | undefined;
    const list = await offerings.list(tokenId);
    res.json({ offerings: list });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const offering = await offerings.getById(req.params.id);
    if (!offering) {
      res.status(404).json({ error: 'Offering not found' });
      return;
    }
    res.json({ offering });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  tokenId: z.string().uuid(),
  assetId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  escrowContractAddr: z.string().optional(),
  userConfirmedEconomics: z.literal(true),
});

router.post('/', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const result = await offerings.create(body);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});

router.post('/:id/activate', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const offering = await offerings.activate(req.params.id);
    res.json({ offering });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/settle', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ userConfirmedEconomics: z.literal(true) }).parse(req.body);
    const result = await offerings.closeAndAllocate(
      req.params.id,
      body.userConfirmedEconomics
    );
    res.json(result);
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
