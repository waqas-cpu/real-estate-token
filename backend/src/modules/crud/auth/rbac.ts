/**
 * Authentication and Role-Based Access Control (RBAC)
 * Roles: SUPER_ADMIN, PROPERTY_ADMIN, COMPLIANCE_OFFICER, LEGAL_OFFICER, ISSUER, INVESTOR, AUDITOR
 */
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../domain/enums.js';
import { UnauthorizedRoleError } from '../errors/DomainError.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  walletAddress?: string;
  investorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      rwaUser?: AuthenticatedUser;
    }
  }
}

// Role permission mapping
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.PROPERTY_ADMIN]: [
    'property:create',
    'property:read',
    'property:update',
    'property:delete',
    'document:upload',
    'document:read',
    'spv:create',
    'spv:read',
    'spv:update',
    'token:create',
    'token:read',
    'token:update',
  ],
  [UserRole.COMPLIANCE_OFFICER]: [
    'kyc:create',
    'kyc:read',
    'kyc:verify',
    'kyc:update',
    'wallet:verify',
    'investor:read',
    'investor:update',
    'audit:read',
  ],
  [UserRole.LEGAL_OFFICER]: [
    'spv:create',
    'spv:read',
    'spv:update',
    'document:verify',
    'property:read',
    'token:read',
  ],
  [UserRole.ISSUER]: [
    'property:create',
    'property:read',
    'property:update',
    'document:upload',
    'document:read',
    'token:read',
    'allocation:read',
  ],
  [UserRole.INVESTOR]: [
    'property:read',
    'token:read',
    'allocation:create',
    'allocation:read',
    'wallet:create',
    'wallet:read',
    'investor:read',
    'investor:update',
    'transaction:read',
  ],
  [UserRole.AUDITOR]: [
    'property:read',
    'document:read',
    'spv:read',
    'token:read',
    'allocation:read',
    'transaction:read',
    'audit:read',
  ],
};

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.rwaUser;
    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required. Bearer token or credentials missing.',
        },
      });
      return;
    }

    if (user.role === UserRole.SUPER_ADMIN || allowedRoles.includes(user.role)) {
      next();
      return;
    }

    const err = new UnauthorizedRoleError(allowedRoles, user.role);
    res.status(err.statusCode).json(err.toJSON());
  };
}

export function rwaAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Support mock/dev header or extract from decoded JWT
  const roleHeader = req.headers['x-role'] as string;
  const userIdHeader = req.headers['x-user-id'] as string;
  const emailHeader = req.headers['x-user-email'] as string;

  if (userIdHeader) {
    const matchedRole = Object.values(UserRole).includes(roleHeader as UserRole)
      ? (roleHeader as UserRole)
      : UserRole.INVESTOR;

    req.rwaUser = {
      id: userIdHeader,
      email: emailHeader || `${userIdHeader}@platform.local`,
      role: matchedRole,
      walletAddress: (req.headers['x-wallet-address'] as string) || undefined,
      investorId: (req.headers['x-investor-id'] as string) || undefined,
    };
  } else if (req.user?.id) {
    // Bridges from root optionalAuth if present
    req.rwaUser = {
      id: req.user.id,
      email: req.user.email || 'user@rwa.com',
      role: UserRole.INVESTOR, // Default standard
    };
  }

  next();
}
