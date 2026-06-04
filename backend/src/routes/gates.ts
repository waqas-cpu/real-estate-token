import { Router } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

const router = Router();

router.get('/boundaries', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
    const { data, error } = await getSupabaseAdmin()
      .from('layer_boundaries')
      .select('*')
      .order('crossed_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ boundaries: data ?? [] });
  } catch (err) {
    next(err);
  }
});

export default router;
