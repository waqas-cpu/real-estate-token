import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

router.get('/assets', async (req, res, next) => {
  try {
    const verifiedOnly = req.query.verified === 'true';
    const supabase = getSupabaseAdmin();
    let q = supabase.from('physical_assets').select('*');
    if (verifiedOnly) q = q.eq('verified', true);
    const { data: assets, error } = await q.order('created_at', { ascending: false });

    if (error) throw error;
    const list = assets ?? [];
    const assetIds = list.map((a: { id: string }) => a.id);

    const summaries: Record<
      string,
      {
        valuationFmv: number | null;
        totalSupply: string | null;
        tokenSymbol: string | null;
        offering: unknown;
      }
    > = {};

    if (assetIds.length) {
      const [{ data: tokens }, { data: valuations }] = await Promise.all([
        supabase.from('security_tokens').select('*').in('asset_id', assetIds),
        supabase.from('valuations').select('asset_id, fmv, computed_at').in('asset_id', assetIds),
      ]);

      const tokenByAsset = new Map(
        (tokens ?? []).map((t: { asset_id: string }) => [t.asset_id, t])
      );
      const valByAsset = new Map<string, number>();
      for (const v of valuations ?? []) {
        const row = v as { asset_id: string; fmv: number; computed_at: string };
        const prev = valByAsset.get(row.asset_id);
        if (prev == null || row.fmv > prev) valByAsset.set(row.asset_id, row.fmv);
      }

      const tokenIds = (tokens ?? []).map((t: { id: string }) => t.id);
      let offerings: unknown[] = [];
      if (tokenIds.length) {
        const { data: offs } = await supabase
          .from('token_offerings')
          .select('*')
          .in('token_id', tokenIds)
          .in('status', ['ACTIVE', 'PENDING', 'CLOSED']);
        offerings = offs ?? [];
      }
      const offByToken = new Map(
        (offerings as { token_id: string }[]).map((o) => [o.token_id, o])
      );

      for (const id of assetIds) {
        const token = tokenByAsset.get(id) as
          | { id: string; symbol: string; total_supply: string }
          | undefined;
        summaries[id] = {
          valuationFmv: valByAsset.get(id) ?? null,
          totalSupply: token?.total_supply ?? null,
          tokenSymbol: token?.symbol ?? null,
          offering: token ? (offByToken.get(token.id) ?? null) : null,
        };
      }
    }

    res.json({ assets: list, summaries });
  } catch (err) {
    next(err);
  }
});

router.get('/assets/:id', async (req, res, next) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data: asset, error } = await supabase
      .from('physical_assets')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    const [{ data: valuation }, { data: risk }, { data: twin }] = await Promise.all([
      supabase
        .from('valuations')
        .select('*')
        .eq('asset_id', req.params.id)
        .order('computed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('risk_scores')
        .select('*')
        .eq('asset_id', req.params.id)
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('digital_twins')
        .select('*')
        .eq('asset_id', req.params.id)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const { data: token } = await supabase
      .from('security_tokens')
      .select('*')
      .eq('asset_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let offering = null;
    if (token) {
      const { data: off } = await supabase
        .from('token_offerings')
        .select('*')
        .eq('token_id', token.id)
        .in('status', ['ACTIVE', 'PENDING'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      offering = off;
    }

    res.json({ asset, valuation, risk, twin, token, offering });
  } catch (err) {
    next(err);
  }
});

export default router;
