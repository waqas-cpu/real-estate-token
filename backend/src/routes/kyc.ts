import { Router } from 'express';
import { z } from 'zod';
import { PipelineService } from '../services/PipelineService.js';
import { IntelligenceAgentService } from '../services/IntelligenceAgentService.js';
import { KycKybWhitelistingService } from '../services/KycKybWhitelistingService.js';
import { getSupabaseAdmin } from '../supabase.js';
import { config } from '../config.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { requireCompliance } from '../middleware/rbac.js';

const router = Router();
const pipeline = new PipelineService();
const intelligenceAgent = new IntelligenceAgentService();
const whitelistingService = new KycKybWhitelistingService();
const KYC_BUCKET = 'kyc-documents';

/** Sumsub applicantReviewed / applicantPending webhooks */
router.post('/webhooks/sumsub', async (req, res, next) => {
  try {
    const secret = req.headers['x-payload-digest'] ?? req.headers['x-sumsub-signature'];
    if (config.sumsubWebhookSecret && secret !== config.sumsubWebhookSecret) {
      res.status(401).json({ error: 'Invalid Sumsub webhook secret' });
      return;
    }
    const result = await intelligenceAgent.handleSumsubWebhook(
      req.body as Record<string, unknown>
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/status', optionalAuth, async (req, res, next) => {
  try {
    const wallet =
      (req.query.wallet as string) ||
      (req.headers['x-investor-wallet'] as string);

    if (!wallet) {
      res.status(400).json({ error: 'wallet query param or x-investor-wallet header required' });
      return;
    }

    const { data, error } = await getSupabaseAdmin()
      .from('kyc_records')
      .select('*')
      .eq('investor_wallet', wallet)
      .maybeSingle();

    if (error) throw error;
    res.json({ kyc: data });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        investorWallet: z.string().min(1),
        jurisdiction: z.string().default('US'),
      })
      .parse(req.body);

    const result = await pipeline.processSecurityForInvestor(
      body.investorWallet,
      body.jurisdiction,
      req.user!.id
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/** Store KYC document metadata + optional base64 file in Supabase Storage */
router.post('/upload-docs', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        investorWallet: z.string().min(1),
        documentType: z.enum(['ID', 'ACCREDITATION', 'PROOF_OF_ADDRESS', 'OTHER']),
        fileName: z.string(),
        contentBase64: z.string().optional(),
        externalProvider: z.enum(['SUMSUB', 'ONFIDO', 'MANUAL']).optional(),
        externalApplicantId: z.string().optional(),
      })
      .parse(req.body);

    const supabase = getSupabaseAdmin();
    const pathKey = `${body.investorWallet}/${body.documentType}_${Date.now()}_${body.fileName}`;

    let storagePath: string | null = null;
    if (body.contentBase64) {
      const buffer = Buffer.from(body.contentBase64, 'base64');
      const { error: uploadError } = await supabase.storage
        .from(KYC_BUCKET)
        .upload(pathKey, buffer, { contentType: 'application/octet-stream', upsert: false });

      if (uploadError) {
        res.status(503).json({
          error: 'Supabase Storage upload failed — create bucket "kyc-documents" (private) in dashboard',
          detail: uploadError.message,
          sumsubHint: 'Or set externalProvider: SUMSUB and wire Sumsub webhook',
        });
        return;
      }
      storagePath = pathKey;
    }

    res.status(201).json({
      stored: Boolean(storagePath),
      storagePath,
      bucket: KYC_BUCKET,
      documentType: body.documentType,
      externalProvider: body.externalProvider ?? 'MANUAL',
      externalApplicantId: body.externalApplicantId,
      note:
        body.externalProvider === 'SUMSUB'
          ? 'Production: verify via Sumsub API webhook'
          : 'Document metadata recorded; complete KYC via POST /api/kyc/verify',
    });
  } catch (err) {
    next(err);
  }
});

/** Submit Corporate KYB Profile with Ultimate Beneficial Owners (UBOs) */
router.post('/kyb/submit', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      walletAddress: z.string().min(1),
      companyName: z.string().min(2),
      companyJurisdiction: z.string().min(2),
      registrationNumber: z.string().min(2),
      taxIdNumber: z.string().optional(),
      beneficialOwners: z.array(
        z.object({
          fullName: z.string().min(2),
          citizenship: z.string().min(2),
          ownershipPercentage: z.number().min(0).max(100),
          taxIdNumber: z.string().optional(),
          isPep: z.boolean().optional(),
        })
      ).min(1),
      operatingAgreementCid: z.string().optional(),
    });

    const body = schema.parse(req.body);
    const result = await whitelistingService.submitKyb(body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** Review and Approve/Reject KYB Corporate Application (Requires COMPLIANCE or ADMIN role) */
router.post('/kyb/review', optionalAuth, requireAuth, requireCompliance, async (req, res, next) => {
  try {
    const schema = z.object({
      walletAddress: z.string().min(1),
      decision: z.enum(['APPROVED', 'REJECTED']),
    });

    const body = schema.parse(req.body);
    const result = await whitelistingService.reviewKyb(body.walletAddress, body.decision, req.user!.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/** Whitelist verified wallet on-chain and off-chain (Requires COMPLIANCE or ADMIN role) */
router.post('/whitelist', optionalAuth, requireAuth, requireCompliance, async (req, res, next) => {
  try {
    const schema = z.object({
      walletAddress: z.string().min(1),
      countryCode: z.number().optional(),
      claims: z.array(z.string()).optional(),
    });

    const body = schema.parse(req.body);
    const result = await whitelistingService.whitelistWallet(body.walletAddress, {
      countryCode: body.countryCode,
      claims: body.claims,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Revoke whitelisting (Requires COMPLIANCE or ADMIN role) */
router.post('/whitelist/revoke', optionalAuth, requireAuth, requireCompliance, async (req, res, next) => {
  try {
    const schema = z.object({
      walletAddress: z.string().min(1),
      reason: z.string().min(3),
    });

    const body = schema.parse(req.body);
    const result = await whitelistingService.revokeWhitelist(body.walletAddress, body.reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Query full whitelisting and KYC/KYB status for an investor wallet */
router.get('/whitelist/:wallet', optionalAuth, async (req, res, next) => {
  try {
    const status = await whitelistingService.getStatus(req.params.wallet);
    res.json({ status });
  } catch (err) {
    next(err);
  }
});

export default router;
