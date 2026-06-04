import { Router } from 'express';
import { z } from 'zod';
import { GovernanceService } from '../services/GovernanceService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const governance = new GovernanceService();

router.get('/votes', async (req, res, next) => {
  try {
    const voterWallet = req.query.voterWallet as string | undefined;
    const proposalId = req.query.proposalId as string | undefined;
    const votes = await governance.listVotes({ voterWallet, proposalId });
    res.json({ votes });
  } catch (err) {
    next(err);
  }
});

router.get('/proposals', async (req, res, next) => {
  try {
    const tokenId = req.query.tokenId as string | undefined;
    const proposals = await governance.list(tokenId);
    res.json({ proposals });
  } catch (err) {
    next(err);
  }
});

router.post('/proposals', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        tokenId: z.string().uuid(),
        title: z.string().min(3),
        description: z.string().optional(),
        proposalType: z.enum(['MANAGER_CHANGE', 'CAPEX', 'SALE', 'EMERGENCY']),
        timelockDays: z.number().int().min(1).max(30).optional(),
      })
      .parse(req.body);

    const proposal = await governance.create({
      ...body,
      proposerId: req.user!.id,
    });
    res.status(201).json({ proposal });
  } catch (err) {
    next(err);
  }
});

router.post('/proposals/:id/activate', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const proposal = await governance.activate(req.params.id);
    res.json({ proposal });
  } catch (err) {
    next(err);
  }
});

router.post('/vote', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        proposalId: z.string().uuid(),
        voterWallet: z.string().min(1),
        support: z.boolean(),
        tokenBalanceWei: z.string().regex(/^[0-9]+$/),
      })
      .parse(req.body);

    const vote = await governance.castVote(
      body.proposalId,
      body.voterWallet,
      body.support,
      body.tokenBalanceWei
    );
    res.status(201).json({
      vote,
      note: 'Off-chain vote recorded. On-chain Governor executes after contract deployment.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
