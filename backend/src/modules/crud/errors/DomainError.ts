/**
 * Domain and Application Error Hierarchies (RFC 7807 compliant)
 */

export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly code: string;

  constructor(message: string, public readonly details?: unknown) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(requestId?: string) {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        request_id: requestId || undefined,
      },
    };
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly code = 'VALIDATION_ERROR';
}

export class EntityNotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly code = 'ENTITY_NOT_FOUND';

  constructor(entity: string, id: string) {
    super(`${entity} with identifier '${id}' was not found.`);
  }
}

export class DuplicateEntityError extends AppError {
  public readonly statusCode = 409;
  public readonly code = 'DUPLICATE_ENTITY';

  constructor(entity: string, field: string, value: string) {
    super(`${entity} with ${field} '${value}' already exists.`);
  }
}

export class InvalidStateTransitionError extends AppError {
  public readonly statusCode = 422;
  public readonly code = 'INVALID_STATE_TRANSITION';

  constructor(entity: string, current: string, target: string, reason?: string) {
    super(
      `Illegal transition for ${entity} from '${current}' to '${target}'. ${reason || ''}`.trim()
    );
  }
}

export class ImmutableRecordError extends AppError {
  public readonly statusCode = 422;
  public readonly code = 'RECORD_IMMUTABLE';

  constructor(entity: string, reason: string) {
    super(`Cannot modify ${entity}: record is immutable. ${reason}`);
  }
}

export class SupplyExceededError extends AppError {
  public readonly statusCode = 422;
  public readonly code = 'SUPPLY_EXCEEDED';

  constructor(requested: string, available: string) {
    super(`Requested allocation ${requested} exceeds remaining available token supply ${available}.`);
  }
}

export class IneligibleInvestorError extends AppError {
  public readonly statusCode = 403;
  public readonly code = 'INELIGIBLE_INVESTOR';

  constructor(reason: string) {
    super(`Investor is not eligible to participate: ${reason}`);
  }
}

export class UnauthorizedRoleError extends AppError {
  public readonly statusCode = 403;
  public readonly code = 'UNAUTHORIZED_ROLE';

  constructor(requiredRoles: string[], currentRole?: string) {
    super(
      `Forbidden: Required role(s) [${requiredRoles.join(', ')}]. Current role is '${currentRole || 'ANONYMOUS'}'.`
    );
  }
}

export class BlockchainReconciliationError extends AppError {
  public readonly statusCode = 409;
  public readonly code = 'BLOCKCHAIN_RECONCILIATION_FAILED';

  constructor(reason: string) {
    super(`Blockchain state reconciliation error: ${reason}`);
  }
}
