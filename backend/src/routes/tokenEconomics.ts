import { Router } from 'express';
import { z } from 'zod';
import {
  TokenEconomicsService,
  TokenEconomicsGuardError,
} from '../services/TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const economics = new TokenEconomicsService();

router.get('/policy', (_req, res) => {
  res.json({
    ...economics.getPlatformPolicy(),
    ...economics.getDecisionsRequired(),
  });
});

router.get('/platform-policy', (_req, res) => {
  res.json(economics.getPlatformPolicy());
});

router.get('/decisions-required', (_req, res) => {
  res.json(economics.getDecisionsRequired());
});

router.post('/preview', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z.object({ assetId: z.string().uuid() }).parse(req.body);
    const preview = await economics.previewEconomics(body);
    res.json(preview);
  } catch (err) {
    next(err);
  }
});

router.post('/quote', optionalAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        assetId: z.string().uuid(),
        tokenCount: z.number().int().min(1).max(PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor),
      })
      .parse(req.body);

    const bundle = await economics.buildEconomicsForAsset(body.assetId);
    const quote = economics.computeSubscriptionUsdcMicro(
      body.tokenCount,
      BigInt(bundle.tokenPriceUsdcMicro)
    );
    const annualYield = economics.computeAnnualYieldUsdcMicro(
      body.tokenCount,
      bundle.fmvUsd!
    );

    res.json({
      assetId: body.assetId,
      tokenCount: body.tokenCount,
      currency: PLATFORM_TOKEN_ECONOMICS.currency,
      tokenPriceUsdc: bundle.tokenPriceDisplay,
      listUsdcMicro: quote.listUsdcMicro.toString(),
      paidUsdcMicro: quote.usdcMicro.toString(),
      discountPercent: quote.discountPercent,
      fullStakeDiscount:
        body.tokenCount === PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor,
      projectedAnnualYieldUsdcMicro: annualYield.toString(),
      projectedMonthlyYieldUsdcMicro: (annualYield / 12n).toString(),
      maxTokensPerInvestor: PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/validate', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        assetId: z.string().uuid(),
        userConfirmedEconomics: z.literal(true),
      })
      .parse(req.body);

    economics.assertOwnerConfirmed(true);
    const bundle = await economics.buildEconomicsForAsset(body.assetId);
    economics.validateSupply(bundle.totalSupply);

    res.json({ valid: true, economics: bundle });
  } catch (err) {
    if (err instanceof TokenEconomicsGuardError) {
      res.status(403).json({ code: err.code, error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
