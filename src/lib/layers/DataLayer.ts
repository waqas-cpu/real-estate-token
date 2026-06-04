/**
 * DATA LAYER - Physical Reality → Verified Digital Twin
 * =====================================================
 * Responsible for:
 * - Asset ingestion from registries, IoT, legal sources
 * - Digital twin creation and versioning
 * - Content-addressed hashing (SHA3-512)
 * - IPFS anchoring
 * - Oracle attestation coordination
 */

import {
  PhysicalAsset,
  OracleAttestation,
  DigitalTwin,
} from '../types/architecture';
import { hashAssetIntegrity } from '../utils/hash';
import { pinJsonToIpfs, getIpfsPinMode } from '../integrations/pinata';
import { verifyUtf8Message } from '../crypto/pqc/nist.js';
import { getOracleSigningKeyPair } from '../crypto/pqc/keyStore.js';
import {
  fetchRegistryProperty,
  type RegistryType,
} from '../integrations/registry.js';
import {
  fetchOracleFeed,
  buildSignedAttestation,
} from '../integrations/oracles.js';
import { enrichTwinWithPendingAnchor } from '../integrations/twinAnchor.js';

/**
 * Asset Ingestion Pipeline
 */
export class AssetIngestor {
  async ingestFromRegistry(
    registryType: RegistryType,
    referenceId: string
  ): Promise<{ asset: PhysicalAsset; registryRecord: Awaited<ReturnType<typeof fetchRegistryProperty>> }> {
    const registryRecord = await fetchRegistryProperty(registryType, referenceId);
    const normalized = this.normalizeAssetData(
      registryRecord as unknown as Record<string, unknown>,
      registryType
    );

    // Step 4: Create asset record
    const asset: PhysicalAsset = {
      id: `asset_${Date.now()}`,
      address: String(normalized.address),
      title: String(normalized.title),
      lat: Number(normalized.latitude),
      lng: Number(normalized.longitude),
      squareFeet: Number(normalized.squareFeet),
      bedrooms: Number(normalized.bedrooms),
      bathrooms: Number(normalized.bathrooms),
      yearBuilt: Number(normalized.yearBuilt),
      registrySource: registryType,
      contentHash: hashAssetIntegrity({
        address: String(normalized.address),
        title: String(normalized.title),
        lat: Number(normalized.latitude),
        lng: Number(normalized.longitude),
        squareFeet: Number(normalized.squareFeet),
        bedrooms: Number(normalized.bedrooms),
        bathrooms: Number(normalized.bathrooms),
        yearBuilt: Number(normalized.yearBuilt),
        registrySource: registryType,
      }),
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { asset, registryRecord };
  }

  private normalizeAssetData(
    raw: Record<string, unknown>,
    registryType: string
  ): Record<string, unknown> {
    // Normalize different registry formats to canonical schema
    const schema: Record<string, unknown> = {
      address: raw.address || raw.propertyAddress || '',
      title: raw.title || raw.propertyTitle || '',
      latitude: raw.latitude || raw.lat || 0,
      longitude: raw.longitude || raw.lng || 0,
      squareFeet: raw.squareFeet || raw.area || 0,
      bedrooms: raw.bedrooms || 0,
      bathrooms: raw.bathrooms || 0,
      yearBuilt: raw.yearBuilt || raw.constructionYear || 0,
    };
    return schema;
  }

}

/**
 * Digital Twin Management
 */
export class DigitalTwinManager {
  /**
   * Create versioned twin
   * Rule: Twin must be IPFS-pinned before CID on-chain
   */
  async createTwin(asset: PhysicalAsset): Promise<DigitalTwin> {
    // Step 1: Build structured record
    const twinData = {
      assetId: asset.id,
      address: asset.address,
      title: asset.title,
      location: { lat: asset.lat, lng: asset.lng },
      physical: {
        squareFeet: asset.squareFeet,
        bedrooms: asset.bedrooms,
        bathrooms: asset.bathrooms,
        yearBuilt: asset.yearBuilt,
      },
      titleChain: [],
      encumbrances: [],
      valuationHistory: [],
      sourceRegistry: asset.registrySource,
      contentHash: asset.contentHash,
      createdAt: new Date().toISOString(),
    };

    const pinMode = getIpfsPinMode();
    const cid = await this.pinToIPFS(twinData);

    const twin: DigitalTwin = {
      id: `twin_${Date.now()}`,
      assetId: asset.id,
      cid,
      version: 1,
      schema: {
        ...twinData,
        ipfsPinMode: pinMode,
      },
      titleChain: [],
      encumbrances: [],
      valuationHistory: [],
      lastUpdated: new Date(),
      attestationQuorum: 2, // Require 2-of-3 oracle attestations
    };

    return twin;
  }

  /**
   * Update twin with new data
   * Rule: Each update increments version and requires oracle re-attestation
   */
  async updateTwin(
    twin: DigitalTwin,
    changes: Partial<Record<string, unknown>>
  ): Promise<DigitalTwin> {
    const updated = {
      ...twin.schema,
      ...changes,
      lastUpdated: new Date().toISOString(),
    };

    const newCid = await this.pinToIPFS(updated);

    return {
      ...twin,
      cid: newCid,
      version: twin.version + 1,
      schema: updated,
      lastUpdated: new Date(),
    };
  }

  private async pinToIPFS(data: Record<string, unknown>): Promise<string> {
    return pinJsonToIpfs(data);
  }
}

/**
 * Oracle Attestation Coordination
 */
export class OracleCoordinator {
  /**
   * Collect oracle attestations
   * Rule: Minimum quorum required before data crosses to Intelligence layer
   */
  async collectAttestations(
    assetId: string,
    dataType: 'VALUATION' | 'CONDITION' | 'MARKET' | 'LEGAL',
    requiredQuorum: number
  ): Promise<OracleAttestation[]> {
    const attestations: OracleAttestation[] = [];

    // Request from multiple oracles
    const sources = ['CHAINLINK', 'PYTH', 'CUSTOM'] as const;

    for (const source of sources) {
      if (attestations.length >= requiredQuorum) break;

      const att = await this.requestOracleAttestation(
        assetId,
        dataType,
        source as any
      );
      attestations.push(att);
    }

    if (attestations.length < requiredQuorum) {
      throw new Error(
        `Failed to collect required attestations (got ${attestations.length}, need ${requiredQuorum})`
      );
    }

    return attestations;
  }

  private async requestOracleAttestation(
    assetId: string,
    dataType: string,
    source: 'CHAINLINK' | 'PYTH' | 'CUSTOM'
  ): Promise<OracleAttestation> {
    const feed = await fetchOracleFeed(assetId, dataType, source);
    return buildSignedAttestation(assetId, dataType as OracleAttestation['dataType'], feed);
  }

  /**
   * Verify oracle signatures (ML-DSA-87 FIPS 204)
   * Rule: All signatures must be valid before data is trusted
   */
  async verifyAttestationSignatures(
    attestations: OracleAttestation[]
  ): Promise<boolean> {
    for (const att of attestations) {
      const isValid = await this.verifyML_DSA87(
        att.value,
        att.signatureML_DSA,
        att.source,
        att.assetId,
        att.dataType
      );
      if (!isValid) {
        return false;
      }
    }
    return true;
  }

  private async verifyML_DSA87(value: string, signature: string, source: string, assetId: string, dataType: string): Promise<boolean> {
    const oracleKey = getOracleSigningKeyPair();
    const payload = `${assetId}|${dataType}|${value}|${source}`;
    return verifyUtf8Message(payload, signature, oracleKey.publicKeyEnc);
  }
}

/**
 * Data Layer Orchestrator
 */
export class DataLayerOrchestrator {
  private ingestor: AssetIngestor;
  private twinManager: DigitalTwinManager;
  private oracleCoordinator: OracleCoordinator;

  constructor() {
    this.ingestor = new AssetIngestor();
    this.twinManager = new DigitalTwinManager();
    this.oracleCoordinator = new OracleCoordinator();
  }

  /**
   * Complete ingestion pipeline
   * Input: Registry reference
   * Output: Verified asset + digital twin + oracle attestations
   */
  async ingestAsset(
    registryType: 'HM_LAND_REGISTRY' | 'TORRENS' | 'CADASTER',
    referenceId: string
  ): Promise<{
    asset: PhysicalAsset;
    twin: DigitalTwin;
    attestations: OracleAttestation[];
  }> {
    // Step 1: Ingest from registry
    const { asset, registryRecord } = await this.ingestor.ingestFromRegistry(
      registryType,
      referenceId
    );

    let twin = await this.twinManager.createTwin(asset);
    if (registryRecord.encumbrances?.length) {
      twin = {
        ...twin,
        encumbrances: registryRecord.encumbrances.map((e) => ({
          type: e.type as 'MORTGAGE' | 'LIEN' | 'EASEMENT' | 'COVENANT',
          holder: registryRecord.titleNumber ?? 'registry',
        })),
        schema: {
          ...twin.schema,
          registry: {
            dataSource: registryRecord.dataSource,
            titleNumber: registryRecord.titleNumber,
            referenceId: registryRecord.referenceId,
          },
        },
      };
    }

    // Step 3: Collect oracle attestations
    const attestations = await this.oracleCoordinator.collectAttestations(
      asset.id,
      'LEGAL',
      2
    );

    // Step 4: Verify signatures
    const signaturesValid =
      await this.oracleCoordinator.verifyAttestationSignatures(attestations);
    if (!signaturesValid) {
      throw new Error('Oracle signature verification failed');
    }

    const twinAnchored = enrichTwinWithPendingAnchor(twin, asset.id);

    return { asset, twin: twinAnchored, attestations };
  }
}
