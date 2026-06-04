import { Router } from 'express';
import { z } from 'zod';
import { ExecutionService } from '../services/ExecutionService.js';
import { TokenEconomicsGuardError, TokenEconomicsService } from '../services/TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { getSupabaseAdmin } from '../supabase.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const execution = new ExecutionService();

router.get('/tokens', async (_req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('security_tokens')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ tokens: data ?? [] });
  } catch (err) {
    next(err);
  }
});

router.get('/verifications', async (_req, res, next) => {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('physical_assets')
      .select('*')
      .eq('verified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ pending: data ?? [] });
  } catch (err) {
    next(err);
  }
});

const tokenizeSchema = z.object({
  assetId: z.string().uuid(),
  symbol: z.string().min(2).max(12),
  totalSupply: z
    .string()
    .optional()
    .default(String(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply)),
  decimals: z.number().int().optional().default(PLATFORM_TOKEN_ECONOMICS.tokenDecimals),
  complianceModules: z
    .array(z.string())
    .optional()
    .default(['MaxBalanceModule:10PercentPerInvestor', 'CountryRestrict', 'USDC']),
  contractAddress: z.string().optional(),
  trexIdentityRegistry: z.string().optional(),
  userConfirmedEconomics: z.literal(true),
});

const economicsSvc = new TokenEconomicsService();

/** Register token metadata — does NOT deploy contracts unless you supply contractAddress. */
router.post('/tokenize', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = tokenizeSchema.parse(req.body);
    const econ = await economicsSvc.buildEconomicsForAsset(body.assetId);
    const token = await execution.registerTokenMetadata({
      assetId: body.assetId,
      symbol: body.symbol,
      totalSupply: body.totalSupply,
      decimals: body.decimals,
      creatorId: req.user!.id,
      complianceModules: body.complianceModules,
      contractAddress: body.contractAddress,
      trexIdentityRegistry: body.trexIdentityRegistry,
      userConfirmedEconomics: body.userConfirmedEconomics,
    });
    res.status(201).json({
      token,
      economics: econ,
      deploymentNote: body.contractAddress
        ? 'Registered with your deployed contract address.'
        : 'Pending on-chain deployment — contract_address is a placeholder until you deploy and update.',
      economicsNote: `Fixed ${PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply} tokens · USDC price ${econ.tokenPriceDisplay}`,
    });
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({
        code: err.code,
        error: err.message,
        hint: 'GET /api/token-economics/policy',
      });
      return;
    }
    next(err);
  }
});

export default router;
