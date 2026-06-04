import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/metrics', optionalAuth, requireAuth, async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const [assets, tokens, distributions] = await Promise.all([
      supabase.from('physical_assets').select('id', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('security_tokens').select('id', { count: 'exact', head: true }),
      supabase.from('income_distributions').select('id', { count: 'exact', head: true }),
    ]);

    res.json({
      verifiedAssets: assets.count ?? 0,
      securityTokens: tokens.count ?? 0,
      distributions: distributions.count ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/holdings', optionalAuth, async (req, res) => {
  res.json({
    holdings: [],
    message:
      'On-chain balances require deployed ERC-3643 contracts. Register tokens via /api/admin/tokenize after deployment.',
    wallet: req.headers['x-investor-wallet'] ?? null,
  });
});

export default router;
