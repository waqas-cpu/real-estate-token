import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { getSupabaseAdmin } from '../supabase.js';

export function auditApiMutations(req: Request, res: Response, next: NextFunction): void {
  if (!config.auditApiCalls || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user?.id) return;
    void getSupabaseAdmin()
      .from('audit_events')
      .insert({
        event_type: `API_${req.method}_${req.path.replace(/\//g, '_').slice(0, 48)}`,
        layer: 'EXECUTION',
        actor: req.user!.id,
        details: { method: req.method, path: req.path, statusCode: res.statusCode },
        signature_ml_dsa: `api_audit_${Date.now()}`,
      })
      .then(({ error }) => {
        if (error) console.error('Audit API persist failed:', error.message);
      });
  });
  next();
}
