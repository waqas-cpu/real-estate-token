import { Request, Response, NextFunction } from 'express';

export type UserRole =
  | 'ADMIN'
  | 'COMPLIANCE'
  | 'ORACLE'
  | 'EMERGENCY_OPERATOR'
  | 'ASSET_MANAGER'
  | 'INVESTOR';

/**
 * Extract active role from authenticated request (JWT claims, header override for dev, or default).
 */
export function getCallerRole(req: Request): UserRole {
  // Support explicit role assertion in dev or testing via header
  const headerRole = req.headers['x-user-role'] as string | undefined;
  if (headerRole) {
    const normalized = headerRole.toUpperCase() as UserRole;
    if (['ADMIN', 'COMPLIANCE', 'ORACLE', 'EMERGENCY_OPERATOR', 'ASSET_MANAGER', 'INVESTOR'].includes(normalized)) {
      return normalized;
    }
  }

  // Fallback to user role or default to INVESTOR
  return (req.user as any)?.role ?? 'INVESTOR';
}

/**
 * Middleware requiring caller to possess at least one of the specified roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const callerRole = getCallerRole(req);

    // ADMIN has root bypass access for all administrative and operational checks
    if (callerRole === 'ADMIN' || allowedRoles.includes(callerRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Forbidden: Insufficient privileges',
      requiredRoles: allowedRoles,
      currentRole: callerRole,
    });
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireCompliance = requireRole('ADMIN', 'COMPLIANCE');
export const requireEmergencyOperator = requireRole('ADMIN', 'EMERGENCY_OPERATOR');
export const requireOracle = requireRole('ADMIN', 'ORACLE');
export const requireAssetManager = requireRole('ADMIN', 'ASSET_MANAGER');
