import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../supabase.js';

export interface AuthUser {
  id: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Optional auth: attaches user when Bearer token is valid. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (!error && data.user) {
    req.user = { id: data.user.id, email: data.user.email };
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
