/**
 * Deterministic State Machines for RWA Entities
 * Enforces legal, compliance, and financial transition invariants.
 */
import {
  PropertyStatus,
  TokenStatus,
  KycVerificationStatus,
  AllocationStatus,
} from './enums.js';
import { InvalidStateTransitionError } from '../errors/DomainError.js';

export class PropertyStateMachine {
  private static readonly VALID_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
    [PropertyStatus.DRAFT]: [PropertyStatus.UNDER_REVIEW],
    [PropertyStatus.UNDER_REVIEW]: [PropertyStatus.VERIFIED, PropertyStatus.DRAFT],
    [PropertyStatus.VERIFIED]: [PropertyStatus.APPROVED, PropertyStatus.UNDER_REVIEW],
    [PropertyStatus.APPROVED]: [PropertyStatus.TOKENIZATION_PENDING, PropertyStatus.SUSPENDED],
    [PropertyStatus.TOKENIZATION_PENDING]: [PropertyStatus.TOKENIZED, PropertyStatus.APPROVED],
    [PropertyStatus.TOKENIZED]: [PropertyStatus.ACTIVE, PropertyStatus.SUSPENDED],
    [PropertyStatus.ACTIVE]: [PropertyStatus.SUSPENDED, PropertyStatus.CLOSED],
    [PropertyStatus.SUSPENDED]: [PropertyStatus.ACTIVE, PropertyStatus.CLOSED],
    [PropertyStatus.CLOSED]: [], // Terminal
  };

  public static assertTransition(from: PropertyStatus, to: PropertyStatus): void {
    if (from === to) return;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(
        'Property',
        from,
        to,
        `Allowed transitions from ${from} are: [${allowed.join(', ')}]`
      );
    }
  }

  public static canTransition(from: PropertyStatus, to: PropertyStatus): boolean {
    if (from === to) return true;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }
}

export class TokenStateMachine {
  private static readonly VALID_TRANSITIONS: Record<TokenStatus, TokenStatus[]> = {
    [TokenStatus.DRAFT]: [TokenStatus.APPROVED],
    [TokenStatus.APPROVED]: [TokenStatus.DEPLOYMENT_PENDING, TokenStatus.DRAFT],
    [TokenStatus.DEPLOYMENT_PENDING]: [TokenStatus.DEPLOYED, TokenStatus.APPROVED],
    [TokenStatus.DEPLOYED]: [TokenStatus.ACTIVE, TokenStatus.PAUSED],
    [TokenStatus.ACTIVE]: [TokenStatus.PAUSED, TokenStatus.RETIRED],
    [TokenStatus.PAUSED]: [TokenStatus.ACTIVE, TokenStatus.RETIRED],
    [TokenStatus.RETIRED]: [], // Terminal state
  };

  public static assertTransition(from: TokenStatus, to: TokenStatus): void {
    if (from === to) return;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(
        'Token',
        from,
        to,
        `Allowed transitions from ${from} are: [${allowed.join(', ')}]`
      );
    }
  }

  public static canTransition(from: TokenStatus, to: TokenStatus): boolean {
    if (from === to) return true;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }
}

export class KycStateMachine {
  private static readonly VALID_TRANSITIONS: Record<KycVerificationStatus, KycVerificationStatus[]> = {
    [KycVerificationStatus.PENDING]: [KycVerificationStatus.IN_REVIEW, KycVerificationStatus.REJECTED],
    [KycVerificationStatus.IN_REVIEW]: [KycVerificationStatus.VERIFIED, KycVerificationStatus.REJECTED],
    [KycVerificationStatus.VERIFIED]: [KycVerificationStatus.EXPIRED, KycVerificationStatus.REJECTED],
    [KycVerificationStatus.REJECTED]: [KycVerificationStatus.PENDING], // Can re-apply
    [KycVerificationStatus.EXPIRED]: [KycVerificationStatus.PENDING], // Re-verification cycle
  };

  public static assertTransition(from: KycVerificationStatus, to: KycVerificationStatus): void {
    if (from === to) return;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(
        'KycVerification',
        from,
        to,
        `Allowed transitions from ${from} are: [${allowed.join(', ')}]`
      );
    }
  }
}

export class AllocationStateMachine {
  private static readonly VALID_TRANSITIONS: Record<AllocationStatus, AllocationStatus[]> = {
    [AllocationStatus.RESERVED]: [AllocationStatus.SETTLED, AllocationStatus.CANCELLED],
    [AllocationStatus.SETTLED]: [AllocationStatus.REFUNDED],
    [AllocationStatus.CANCELLED]: [],
    [AllocationStatus.REFUNDED]: [],
  };

  public static assertTransition(from: AllocationStatus, to: AllocationStatus): void {
    if (from === to) return;
    const allowed = this.VALID_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
      throw new InvalidStateTransitionError(
        'TokenAllocation',
        from,
        to,
        `Allowed transitions from ${from} are: [${allowed.join(', ')}]`
      );
    }
  }
}
