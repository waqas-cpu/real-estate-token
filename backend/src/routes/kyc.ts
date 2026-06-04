import { Router } from 'express';
import { z } from 'zod';
import { PipelineService } from '../services/PipelineService.js';
import { IntelligenceAgentService } from '../services/IntelligenceAgentService.js';
import { getSupabaseAdmin } from '../supabase.js';
import { config } from '../config.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const pipeline = new PipelineService();
const intelligenceAgent = new IntelligenceAgentService();
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

export default router;
