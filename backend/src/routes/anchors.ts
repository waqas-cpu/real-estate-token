import { Router } from 'express';
import { z } from 'zod';
import { TwinAnchorService } from '../services/TwinAnchorService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();
const twinAnchor = new TwinAnchorService();

router.get('/twin/contract', (_req, res) => {
  res.json({
    contractAddress: twinAnchor.getTwinAnchorContract(),
    anchorScript: 'npm run anchor:twin --prefix contracts -- --assetId <uuid> --cid <ipfs-cid>',
  });
});

router.post('/twin/:assetId/confirm', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const { txHash } = z.object({ txHash: z.string().min(1) }).parse(req.body);
    const result = await twinAnchor.confirmAnchorTx(
      req.params.assetId,
      txHash,
      req.user!.id
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
