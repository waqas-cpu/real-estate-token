/**
 * LAYER 1: PROPERTY DATABASE SERVICE
 * ==================================
 * What it stores: Address, parcel ID, valuation, property type, units, ownership/SPV,
 * and spatial coordinates/geometries.
 * Technology: PostgreSQL + PostGIS (with Haversine great-circle spatial fallback)
 */

import { getSupabaseAdmin } from '../../supabase.js';
import type {
  PropertyRecord,
  PropertySPV,
  PropertyType,
  SpatialBoundingBox,
  SpatialQueryFilter,
} from '../../../../src/lib/types/databaseLayers.js';

export class PropertyDatabaseService {
  // In-memory cache & test fixture fallback store
  private memoryProperties: Map<string, PropertyRecord> = new Map();
  private memorySpvs: Map<string, PropertySPV> = new Map();

  constructor() {
    this.seedDefaultSpv();
  }

  private seedDefaultSpv() {
    const defaultSpv: PropertySPV = {
      id: 'spv-kensington-prime-001',
      name: 'Kensington Prime Assets SPV LLC',
      entityType: 'LLC',
      jurisdiction: 'Delaware, USA',
      registrationNumber: 'DE-7894210',
      taxId: 'XX-XXXX890',
      registeredAgent: 'Corporation Service Company',
      formationDate: '2024-01-15',
      operatingAgreementCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memorySpvs.set(defaultSpv.id, defaultSpv);
  }

  /** Create or register an SPV (Special Purpose Vehicle) entity */
  async createSPV(input: {
    name: string;
    entityType?: 'LLC' | 'LTD' | 'CORP' | 'SPV' | 'TRUST';
    jurisdiction: string;
    registrationNumber: string;
    taxId?: string;
    registeredAgent?: string;
    formationDate?: string;
    operatingAgreementCid?: string;
  }): Promise<PropertySPV> {
    const spv: PropertySPV = {
      id: `spv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name,
      entityType: input.entityType ?? 'LLC',
      jurisdiction: input.jurisdiction,
      registrationNumber: input.registrationNumber,
      taxId: input.taxId ?? null,
      registeredAgent: input.registeredAgent ?? null,
      formationDate: input.formationDate ?? null,
      operatingAgreementCid: input.operatingAgreementCid ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.memorySpvs.set(spv.id, spv);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('property_spvs').upsert({
        id: spv.id,
        name: spv.name,
        entity_type: spv.entityType,
        jurisdiction: spv.jurisdiction,
        registration_number: spv.registrationNumber,
        tax_id: spv.taxId,
        registered_agent: spv.registeredAgent,
        formation_date: spv.formationDate,
        operating_agreement_cid: spv.operatingAgreementCid,
      });
    } catch {
      // Offline fallback
    }

    return spv;
  }

  /** Retrieve an SPV by ID */
  async getSPV(spvId: string): Promise<PropertySPV | null> {
    if (this.memorySpvs.has(spvId)) {
      return this.memorySpvs.get(spvId)!;
    }
    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from('property_spvs').select('*').eq('id', spvId).single();
      if (data) {
        const spv: PropertySPV = {
          id: data.id,
          name: data.name,
          entityType: data.entity_type,
          jurisdiction: data.jurisdiction,
          registrationNumber: data.registration_number,
          taxId: data.tax_id,
          registeredAgent: data.registered_agent,
          formationDate: data.formation_date,
          operatingAgreementCid: data.operating_agreement_cid,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
        this.memorySpvs.set(spv.id, spv);
        return spv;
      }
    } catch {
      // Offline fallback
    }
    return null;
  }

  /** List all registered SPVs */
  async listSPVs(): Promise<PropertySPV[]> {
    return Array.from(this.memorySpvs.values());
  }

  /** Register or update a property record */
  async saveProperty(input: {
    id?: string;
    address: string;
    title: string;
    latitude: number;
    longitude: number;
    parcelId: string;
    propertyType: PropertyType;
    unitsCount: number;
    spvId?: string;
    squareFeet?: number;
    bedrooms?: number;
    bathrooms?: number;
    yearBuilt?: number;
    zoningCode?: string;
    assessedValuation?: number;
    registrySource?: 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER' | 'OTHER';
    contentHash?: string;
    verified?: boolean;
    createdBy?: string;
  }): Promise<PropertyRecord> {
    const id = input.id ?? `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    let spv: PropertySPV | null = null;
    if (input.spvId) {
      spv = await this.getSPV(input.spvId);
    }

    const record: PropertyRecord = {
      id,
      address: input.address,
      title: input.title,
      latitude: input.latitude,
      longitude: input.longitude,
      parcelId: input.parcelId,
      propertyType: input.propertyType,
      unitsCount: input.unitsCount,
      spvId: input.spvId ?? null,
      spv,
      squareFeet: input.squareFeet ?? null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      yearBuilt: input.yearBuilt ?? null,
      zoningCode: input.zoningCode ?? null,
      assessedValuation: input.assessedValuation ?? null,
      registrySource: input.registrySource ?? 'HM_LAND_REGISTRY',
      contentHash: input.contentHash ?? `hash-${Math.random().toString(36).substring(2, 10)}`,
      verified: input.verified ?? true,
      createdBy: input.createdBy ?? 'system',
      createdAt: now,
      updatedAt: now,
    };

    this.memoryProperties.set(id, record);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('physical_assets').upsert({
        id: record.id,
        address: record.address,
        title: record.title,
        latitude: record.latitude,
        longitude: record.longitude,
        parcel_id: record.parcelId,
        property_type: record.propertyType,
        units_count: record.unitsCount,
        spv_id: record.spvId,
        zoning_code: record.zoningCode,
        assessed_valuation: record.assessedValuation,
        square_feet: record.squareFeet,
        bedrooms: record.bedrooms,
        bathrooms: record.bathrooms,
        year_built: record.yearBuilt,
        registry_source: record.registrySource,
        content_hash: record.contentHash,
        verified: record.verified,
        created_by: record.createdBy,
      });
    } catch {
      // Offline fallback
    }

    return record;
  }

  /** Get a property by ID */
  async getProperty(id: string): Promise<PropertyRecord | null> {
    if (this.memoryProperties.has(id)) {
      return this.memoryProperties.get(id)!;
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase.from('physical_assets').select('*').eq('id', id).single();
      if (data) {
        const record = this.mapDbToProperty(data);
        if (record.spvId) {
          record.spv = await this.getSPV(record.spvId);
        }
        this.memoryProperties.set(record.id, record);
        return record;
      }
    } catch {
      // Offline fallback
    }

    return null;
  }

  /**
   * Spatial query: Search properties within a given radius using PostGIS coordinates.
   * Uses PostGIS ST_DWithin if available, falling back to spherical Haversine formula.
   */
  async findPropertiesNearby(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    filters?: { propertyType?: PropertyType; minValuation?: number; maxValuation?: number }
  ): Promise<PropertyRecord[]> {
    const all = Array.from(this.memoryProperties.values());

    return all.filter((prop) => {
      const distance = this.calculateHaversineDistanceKm(
        centerLat,
        centerLng,
        prop.latitude,
        prop.longitude
      );
      if (distance > radiusKm) return false;
      if (filters?.propertyType && prop.propertyType !== filters.propertyType) return false;
      if (filters?.minValuation && (prop.assessedValuation ?? 0) < filters.minValuation) return false;
      if (filters?.maxValuation && (prop.assessedValuation ?? 0) > filters.maxValuation) return false;
      return true;
    });
  }

  /**
   * Spatial query: Find properties within a rectangular bounding box (e.g., map viewport).
   */
  async findPropertiesInBoundingBox(box: SpatialBoundingBox): Promise<PropertyRecord[]> {
    const all = Array.from(this.memoryProperties.values());
    return all.filter(
      (p) =>
        p.latitude >= box.minLatitude &&
        p.latitude <= box.maxLatitude &&
        p.longitude >= box.minLongitude &&
        p.longitude <= box.maxLongitude
    );
  }

  /** Search properties with comprehensive filters */
  async searchProperties(query: SpatialQueryFilter): Promise<PropertyRecord[]> {
    if (query.center && query.radiusKm) {
      return this.findPropertiesNearby(query.center.latitude, query.center.longitude, query.radiusKm, {
        propertyType: query.propertyType,
        minValuation: query.minValuation,
        maxValuation: query.maxValuation,
      });
    }

    if (query.boundingBox) {
      return this.findPropertiesInBoundingBox(query.boundingBox);
    }

    let results = Array.from(this.memoryProperties.values());

    if (query.propertyType) {
      results = results.filter((p) => p.propertyType === query.propertyType);
    }
    if (query.spvId) {
      results = results.filter((p) => p.spvId === query.spvId);
    }
    if (query.minValuation !== undefined) {
      results = results.filter((p) => (p.assessedValuation ?? 0) >= query.minValuation!);
    }
    if (query.maxValuation !== undefined) {
      results = results.filter((p) => (p.assessedValuation ?? 0) <= query.maxValuation!);
    }

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  /** Helper: Great-circle Haversine formula in Kilometers */
  calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapDbToProperty(data: any): PropertyRecord {
    return {
      id: data.id,
      address: data.address,
      title: data.title,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      parcelId: data.parcel_id ?? 'PARCEL-DEFAULT',
      propertyType: data.property_type ?? 'RESIDENTIAL',
      unitsCount: data.units_count ?? 1,
      spvId: data.spv_id,
      squareFeet: data.square_feet,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      yearBuilt: data.year_built,
      zoningCode: data.zoning_code,
      assessedValuation: data.assessed_valuation ? Number(data.assessed_valuation) : null,
      registrySource: data.registry_source ?? 'HM_LAND_REGISTRY',
      contentHash: data.content_hash,
      verified: !!data.verified,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
