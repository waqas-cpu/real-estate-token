/**
 * DATABASE LAYER MANAGER (ORCHESTRATOR)
 * =====================================
 * Unified architectural access layer for the 6 core institutional databases:
 * 1. Property Database (PostgreSQL + PostGIS)
 * 2. Legal / Document Database (PostgreSQL + Object Storage)
 * 3. Investor Database (PostgreSQL)
 * 4. Tokenization Database (PostgreSQL)
 * 5. Blockchain Indexer (The Graph indexer + PostgreSQL cache)
 * 6. Analytics Database (PostgreSQL / ClickHouse time-series)
 */

import { PropertyDatabaseService } from './PropertyDatabaseService.js';
import { LegalDocumentDatabaseService } from './LegalDocumentDatabaseService.js';
import { InvestorDatabaseService } from './InvestorDatabaseService.js';
import { TokenizationDatabaseService } from './TokenizationDatabaseService.js';
import { BlockchainIndexerService } from './BlockchainIndexerService.js';
import { AnalyticsDatabaseService } from './AnalyticsDatabaseService.js';

export class DatabaseLayerManager {
  private static instance: DatabaseLayerManager;

  public readonly property: PropertyDatabaseService;
  public readonly documents: LegalDocumentDatabaseService;
  public readonly investors: InvestorDatabaseService;
  public readonly tokenization: TokenizationDatabaseService;
  public readonly indexer: BlockchainIndexerService;
  public readonly analytics: AnalyticsDatabaseService;

  constructor() {
    this.property = new PropertyDatabaseService();
    this.documents = new LegalDocumentDatabaseService();
    this.investors = new InvestorDatabaseService();
    this.tokenization = new TokenizationDatabaseService();
    this.indexer = new BlockchainIndexerService();
    this.analytics = new AnalyticsDatabaseService();
  }

  public static getInstance(): DatabaseLayerManager {
    if (!DatabaseLayerManager.instance) {
      DatabaseLayerManager.instance = new DatabaseLayerManager();
    }
    return DatabaseLayerManager.instance;
  }

  /**
   * Health and diagnostic summary across all 6 database layers.
   */
  async getDatabaseLayersSummary() {
    const spvs = await this.property.listSPVs();
    const properties = await this.property.searchProperties({ limit: 100 });
    const documents = await this.documents.listDocuments({});
    const investors = await this.investors.listInvestors();
    const token = await this.tokenization.getToken('RWAT');
    const capTable = token ? await this.tokenization.getCapTableSummary(token.id) : null;
    const transfers = await this.indexer.getTransferHistory({ limit: 100 });
    const nav = token ? await this.analytics.getLatestNav(token.id) : null;
    const rentalYield = await this.analytics.getRentalYield('prop-kensington-001');

    return {
      status: 'HEALTHY',
      layers: {
        propertyDatabase: {
          technology: 'PostgreSQL + PostGIS',
          totalProperties: properties.length,
          totalSpvs: spvs.length,
          features: ['Spatial PostGIS queries', 'Parcel IDs', 'SPV mapping', 'Units & zoning'],
        },
        legalDocumentDatabase: {
          technology: 'PostgreSQL + Object Storage',
          totalDocuments: documents.length,
          features: ['Deeds & Title Docs', 'Leases & Contracts', 'KYC/KYB References', 'SHA-256 & PQC ML-DSA-87'],
        },
        investorDatabase: {
          technology: 'PostgreSQL',
          totalInvestors: investors.length,
          features: ['Investor profiles', 'Accreditation tiers', 'KYC/KYB status', 'Jurisdiction compliance'],
        },
        tokenizationDatabase: {
          technology: 'PostgreSQL',
          primaryToken: token?.symbol ?? 'RWAT',
          capTableTotalHolders: capTable?.totalHolders ?? 0,
          totalSupply: token?.totalSupply ?? '0',
          features: ['Token supply', 'SPV issuance tranches', 'Real-time Cap Table', 'Ownership percentages'],
        },
        blockchainIndexer: {
          technology: 'The Graph indexer',
          indexedTransfersCount: transfers.length,
          features: ['Wallet balances', 'Transfers ledger', 'Contract event streams', 'The Graph GraphQL support'],
        },
        analyticsDatabase: {
          technology: 'PostgreSQL / ClickHouse',
          currentNavPerToken: nav?.navPerTokenUsd ?? 100.0,
          grossRentalYieldPct: rentalYield?.grossRentalYieldPct ?? 12.0,
          features: ['NAV progression', 'Rental yield & cashflow', 'Distributions history', 'Secondary liquidity', 'Investor cohorts'],
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const databaseManager = DatabaseLayerManager.getInstance();
