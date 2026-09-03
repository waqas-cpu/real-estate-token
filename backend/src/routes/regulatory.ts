import { Router } from 'express';
import { z } from 'zod';
import { TravelRuleService } from '../services/regulatory/TravelRuleService.js';
import { JurisdictionComplianceService } from '../services/regulatory/JurisdictionComplianceService.js';
import { AccreditationService } from '../services/regulatory/AccreditationService.js';
import { TransferComplianceEngine } from '../services/regulatory/TransferComplianceEngine.js';
import { getNetworkProfile } from '../config.js';

const router = Router();
const travelRule = new TravelRuleService();
const jurisdiction = new JurisdictionComplianceService();
const accreditation = new AccreditationService();
const complianceEngine = new TransferComplianceEngine();

router.get('/profile', (_req, res) => {
  const profile = getNetworkProfile();
  res.json({
    profile: profile.name,
    chainId: profile.defaultChainId,
    intelligenceAutoApproveDefault: profile.intelligenceAutoApproveDefault,
    requireAnchoredTwinOnChain: profile.requireAnchoredTwinOnChain,
    useIntegrationFixtures: profile.useIntegrationFixtures,
    mainnetNote:
      profile.name === 'mainnet'
        ? 'Stricter gates; live APIs required; HSM PQC seeds mandatory'
        : 'Testnet fixtures when API keys unset; same code paths as mainnet',
  });
});

router.get('/jurisdictions', (_req, res) => {
  res.json({ jurisdictions: jurisdiction.listSupportedJurisdictions() });
});

router.post('/jurisdiction-check', async (req, res, next) => {
  try {
    const body = z
      .object({
        issuerJurisdiction: z.string(),
        fromJurisdiction: z.string(),
        toJurisdiction: z.string(),
      })
      .parse(req.body);
    const result = await jurisdiction.resolveRulesForTransfer(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/travel-rule/draft', async (req, res, next) => {
  try {
    const body = z
      .object({
        transferRef: z.string(),
        originatorWallet: z.string(),
        beneficiaryWallet: z.string(),
        amountUsdcMicro: z.number().int().positive(),
        assetId: z.string().uuid().optional(),
        jurisdiction: z.string().optional(),
      })
      .parse(req.body);
    const packet = await travelRule.createDraft(body);
    res.status(201).json(packet);
  } catch (err) {
    next(err);
  }
});

router.post('/travel-rule/submit', async (req, res, next) => {
  try {
    const { transferRef } = z.object({ transferRef: z.string() }).parse(req.body);
    const result = await travelRule.submitPacket(transferRef);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/accreditation/check', async (req, res, next) => {
  try {
    const body = z
      .object({ investorWallet: z.string(), jurisdiction: z.string().default('US') })
      .parse(req.body);
    const result = await accreditation.checkAccreditation(
      body.investorWallet,
      body.jurisdiction
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Pre-flight Transfer Compliance Simulation Check */
router.post('/transfer-check', async (req, res, next) => {
  try {
    const schema = z.object({
      tokenId: z.string().optional(),
      fromWallet: z.string().min(1),
      toWallet: z.string().min(1),
      tokenAmount: z.number().positive(),
      tokenPriceUsd: z.number().positive().optional(),
      fromJurisdiction: z.string().optional(),
      toJurisdiction: z.string().optional(),
      fromWhitelisted: z.boolean().optional(),
      toWhitelisted: z.boolean().optional(),
      fromBalance: z.number().optional(),
      toBalance: z.number().optional(),
      totalSupply: z.number().optional(),
      fromLockupUntil: z.string().nullable().optional(),
      originatorVasp: z.string().optional(),
      beneficiaryVasp: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const result = complianceEngine.simulateTransfer(body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
