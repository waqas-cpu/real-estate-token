/**
 * Append-Only Tamper-Evident Audit Service
 */
import { randomUUID } from 'node:crypto';
import { AuditLogEntity } from '../domain/types.js';

export class AuditService {
  private static inMemoryStore: AuditLogEntity[] = [];

  public static async record(params: {
    actorId: string;
    actorRole: string;
    entityType: string;
    entityId: string;
    action: string;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    ipReference?: string | null;
    correlationId?: string;
  }): Promise<AuditLogEntity> {
    const entry: AuditLogEntity = {
      audit_id: randomUUID(),
      actor_id: params.actorId,
      actor_role: params.actorRole,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      previous_value: params.previousValue ? JSON.parse(JSON.stringify(params.previousValue)) : null,
      new_value: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : null,
      ip_reference: params.ipReference || null,
      correlation_id: params.correlationId || randomUUID(),
      timestamp: new Date().toISOString(),
    };

    this.inMemoryStore.push(entry);
    if (this.inMemoryStore.length > 10000) {
      this.inMemoryStore.shift();
    }

    return entry;
  }

  public static query(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    correlationId?: string;
    limit?: number;
  }): AuditLogEntity[] {
    let results = [...this.inMemoryStore];

    if (filters.entityType) {
      results = results.filter((r) => r.entity_type === filters.entityType);
    }
    if (filters.entityId) {
      results = results.filter((r) => r.entity_id === filters.entityId);
    }
    if (filters.actorId) {
      results = results.filter((r) => r.actor_id === filters.actorId);
    }
    if (filters.correlationId) {
      results = results.filter((r) => r.correlation_id === filters.correlationId);
    }

    return results.slice(-(filters.limit || 50)).reverse();
  }
}
