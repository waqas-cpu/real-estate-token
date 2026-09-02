/**
 * LAYER 6: ANALYTICS DATABASE SERVICE
 * ===================================
 * What it stores: NAV, rental yield, distributions, liquidity, investor metrics.
 * Suitable technology: PostgreSQL / ClickHouse (Time-series / Columnar rollups)
 */

import { getSupabaseAdmin } from '../../supabase.js';
import type {
  NavSnapshot,
  RentalYieldMetrics,
  DistributionAnalytics,
  LiquidityMetrics,
  InvestorCohortAnalytics,
} from '../../../../src/lib/types/databaseLayers.js';

export class AnalyticsDatabaseService {
  private memoryNavSnapshots: NavSnapshot[] = [];
  private memoryRentalYields: RentalYieldMetrics[] = [];
  private memoryDistributions: DistributionAnalytics[] = [];
  private memoryLiquidity: Map<string, LiquidityMetrics> = new Map();
  private memoryInvestorMetrics: InvestorCohortAnalytics[] = [];

  constructor() {
    this.seedDefaultAnalytics();
  }

  private seedDefaultAnalytics() {
    const now = new Date().toISOString();
    const pastMonth = new Date(Date.now() - 30 * 86400000).toISOString();
    const pastTwoMonths = new Date(Date.now() - 60 * 86400000).toISOString();

    const tokenId = 'token-kensington-rwat-001';
    const propertyId = 'prop-kensington-001';

    // 1. Seed NAV History (Growing from $3.0M to $3.15M)
    this.memoryNavSnapshots.push(
      {
        id: 'nav-001',
        tokenId,
        propertyId,
        totalAssetValuationUsd: 3000000,
        totalLiabilitiesUsd: 0,
        netAssetValueUsd: 3000000,
        totalTokenSupply: '30000',
        navPerTokenUsd: 100.0,
        valuationMethod: 'INDEPENDENT_APPRAISAL',
        recordedAt: pastTwoMonths,
        createdAt: pastTwoMonths,
      },
      {
        id: 'nav-002',
        tokenId,
        propertyId,
        totalAssetValuationUsd: 3075000,
        totalLiabilitiesUsd: 0,
        netAssetValueUsd: 3075000,
        totalTokenSupply: '30000',
        navPerTokenUsd: 102.5,
        valuationMethod: 'CHAINLINK_ORACLE_CONSENSUS',
        recordedAt: pastMonth,
        createdAt: pastMonth,
      },
      {
        id: 'nav-003',
        tokenId,
        propertyId,
        totalAssetValuationUsd: 3150000,
        totalLiabilitiesUsd: 0,
        netAssetValueUsd: 3150000,
        totalTokenSupply: '30000',
        navPerTokenUsd: 105.0,
        valuationMethod: 'AGENTIC_INTELLIGENCE_LAYER',
        recordedAt: now,
        createdAt: now,
      }
    );

    // 2. Seed Rental Yield
    this.memoryRentalYields.push({
      id: 'yield-001',
      propertyId,
      tokenId,
      grossAnnualRentUsd: 360000,
      annualOperatingExpensesUsd: 60000,
      netOperatingIncomeUsd: 300000,
      propertyValuationUsd: 3000000,
      grossRentalYieldPct: 12.0, // (360k / 3.0M) * 100
      netRentalYieldPct: 10.0, // (300k / 3.0M) * 100
      distributionApyPct: 10.0,
      occupancyRatePct: 98.5,
      recordedAt: now,
      createdAt: now,
    });

    // 3. Seed Monthly Distributions
    this.memoryDistributions.push(
      {
        id: 'dist-001',
        tokenId,
        periodLabel: '2026-M04',
        totalDistributedUsdc: 25000,
        distributionRatePerToken: 0.833333,
        annualizedYieldPct: 10.0,
        recipientCount: 14,
        payoutDate: pastMonth,
        merkleRoot: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
        createdAt: pastMonth,
      },
      {
        id: 'dist-002',
        tokenId,
        periodLabel: '2026-M05',
        totalDistributedUsdc: 25000,
        distributionRatePerToken: 0.833333,
        annualizedYieldPct: 10.0,
        recipientCount: 19,
        payoutDate: now,
        merkleRoot: '0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999',
        createdAt: now,
      }
    );

    // 4. Seed Liquidity
    this.memoryLiquidity.set(tokenId, {
      id: 'liq-001',
      tokenId,
      volume24hUsd: 48500,
      tradesCount24h: 12,
      turnoverRatePct: 1.62,
      bidAskSpreadPct: 0.45,
      orderBookDepthUsd: 180000,
      recordedAt: now,
      createdAt: now,
    });

    // 5. Seed Investor Cohorts
    this.memoryInvestorMetrics.push({
      id: 'inv-metrics-001',
      tokenId,
      totalActiveInvestors: 25,
      averageCheckSizeUsd: 40000,
      medianCheckSizeUsd: 15000,
      retailInvestorCount: 20,
      institutionalInvestorCount: 5,
      retentionRatePct: 96.0,
      geographicBreakdown: { US: 14, UK: 6, CH: 3, UAE: 2 },
      cohortMetrics: {
        whales: 3,
        accreditedPercent: 88,
        repeatInvestorsPercent: 44,
      },
      recordedAt: now,
      createdAt: now,
    });
  }

  /** Record a Net Asset Value (NAV) Snapshot */
  async recordNavSnapshot(input: {
    tokenId: string;
    propertyId?: string;
    totalAssetValuationUsd: number;
    totalLiabilitiesUsd?: number;
    totalTokenSupply: string;
    valuationMethod?: string;
  }): Promise<NavSnapshot> {
    const liabilities = input.totalLiabilitiesUsd ?? 0;
    const netAssetValueUsd = input.totalAssetValuationUsd - liabilities;
    const supplyNum = Number(input.totalTokenSupply) || 1;
    const navPerTokenUsd = Number((netAssetValueUsd / supplyNum).toFixed(6));

    const snapshot: NavSnapshot = {
      id: `nav-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tokenId: input.tokenId,
      propertyId: input.propertyId ?? null,
      totalAssetValuationUsd: input.totalAssetValuationUsd,
      totalLiabilitiesUsd: liabilities,
      netAssetValueUsd,
      totalTokenSupply: input.totalTokenSupply,
      navPerTokenUsd,
      valuationMethod: input.valuationMethod ?? 'INDEPENDENT_APPRAISAL',
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryNavSnapshots.unshift(snapshot);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('analytics_nav_snapshots').insert({
        id: snapshot.id,
        token_id: snapshot.tokenId,
        property_id: snapshot.propertyId,
        total_asset_valuation_usd: snapshot.totalAssetValuationUsd,
        total_liabilities_usd: snapshot.totalLiabilitiesUsd,
        net_asset_value_usd: snapshot.netAssetValueUsd,
        total_token_supply: snapshot.totalTokenSupply,
        nav_per_token_usd: snapshot.navPerTokenUsd,
        valuation_method: snapshot.valuationMethod,
        recorded_at: snapshot.recordedAt,
      });
    } catch {
      // Offline fallback
    }

    return snapshot;
  }

  /** Retrieve historical NAV snapshots for a token */
  async getNavHistory(tokenId: string, limit: number = 30): Promise<NavSnapshot[]> {
    return this.memoryNavSnapshots.filter((s) => s.tokenId === tokenId).slice(0, limit);
  }

  /** Retrieve latest NAV snapshot for a token */
  async getLatestNav(tokenId: string): Promise<NavSnapshot | null> {
    const history = await this.getNavHistory(tokenId, 1);
    return history.length > 0 ? history[0] : null;
  }

  /** Record rental yield and operating cashflows */
  async recordRentalYield(input: {
    propertyId: string;
    tokenId?: string;
    grossAnnualRentUsd: number;
    annualOperatingExpensesUsd: number;
    propertyValuationUsd: number;
    occupancyRatePct?: number;
  }): Promise<RentalYieldMetrics> {
    const netOperatingIncomeUsd = input.grossAnnualRentUsd - input.annualOperatingExpensesUsd;
    const grossRentalYieldPct = Number(((input.grossAnnualRentUsd / input.propertyValuationUsd) * 100).toFixed(4));
    const netRentalYieldPct = Number(((netOperatingIncomeUsd / input.propertyValuationUsd) * 100).toFixed(4));
    const distributionApyPct = netRentalYieldPct;

    const metric: RentalYieldMetrics = {
      id: `yield-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      propertyId: input.propertyId,
      tokenId: input.tokenId ?? null,
      grossAnnualRentUsd: input.grossAnnualRentUsd,
      annualOperatingExpensesUsd: input.annualOperatingExpensesUsd,
      netOperatingIncomeUsd,
      propertyValuationUsd: input.propertyValuationUsd,
      grossRentalYieldPct,
      netRentalYieldPct,
      distributionApyPct,
      occupancyRatePct: input.occupancyRatePct ?? 100,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryRentalYields.unshift(metric);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('analytics_rental_yields').insert({
        id: metric.id,
        property_id: metric.propertyId,
        token_id: metric.tokenId,
        gross_annual_rent_usd: metric.grossAnnualRentUsd,
        annual_operating_expenses_usd: metric.annualOperatingExpensesUsd,
        net_operating_income_usd: metric.netOperatingIncomeUsd,
        property_valuation_usd: metric.propertyValuationUsd,
        gross_rental_yield_pct: metric.grossRentalYieldPct,
        net_rental_yield_pct: metric.netRentalYieldPct,
        distribution_apy_pct: metric.distributionApyPct,
        occupancy_rate_pct: metric.occupancyRatePct,
        recorded_at: metric.recordedAt,
      });
    } catch {
      // Offline fallback
    }

    return metric;
  }

  /** Get rental yield metrics for a property */
  async getRentalYield(propertyId: string): Promise<RentalYieldMetrics | null> {
    const found = this.memoryRentalYields.find((y) => y.propertyId === propertyId);
    return found ?? null;
  }

  /** Record a distribution event metric */
  async recordDistributionMetric(input: {
    tokenId: string;
    periodLabel: string;
    totalDistributedUsdc: number;
    distributionRatePerToken: number;
    annualizedYieldPct: number;
    recipientCount: number;
    merkleRoot?: string;
  }): Promise<DistributionAnalytics> {
    const dist: DistributionAnalytics = {
      id: `dist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tokenId: input.tokenId,
      periodLabel: input.periodLabel,
      totalDistributedUsdc: input.totalDistributedUsdc,
      distributionRatePerToken: input.distributionRatePerToken,
      annualizedYieldPct: input.annualizedYieldPct,
      recipientCount: input.recipientCount,
      payoutDate: new Date().toISOString(),
      merkleRoot: input.merkleRoot ?? null,
      createdAt: new Date().toISOString(),
    };

    this.memoryDistributions.unshift(dist);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('analytics_distribution_metrics').insert({
        id: dist.id,
        token_id: dist.tokenId,
        period_label: dist.periodLabel,
        total_distributed_usdc: dist.totalDistributedUsdc,
        distribution_rate_per_token: dist.distributionRatePerToken,
        annualized_yield_pct: dist.annualizedYieldPct,
        recipient_count: dist.recipientCount,
        payout_date: dist.payoutDate,
        merkle_root: dist.merkleRoot,
      });
    } catch {
      // Offline fallback
    }

    return dist;
  }

  /** Get distribution history for a token */
  async getDistributionHistory(tokenId: string): Promise<DistributionAnalytics[]> {
    return this.memoryDistributions.filter((d) => d.tokenId === tokenId);
  }

  /** Record liquidity & secondary trading volume */
  async recordLiquidityMetrics(input: {
    tokenId: string;
    volume24hUsd: number;
    tradesCount24h: number;
    turnoverRatePct: number;
    bidAskSpreadPct?: number;
    orderBookDepthUsd?: number;
  }): Promise<LiquidityMetrics> {
    const metric: LiquidityMetrics = {
      id: `liq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tokenId: input.tokenId,
      volume24hUsd: input.volume24hUsd,
      tradesCount24h: input.tradesCount24h,
      turnoverRatePct: input.turnoverRatePct,
      bidAskSpreadPct: input.bidAskSpreadPct ?? null,
      orderBookDepthUsd: input.orderBookDepthUsd ?? null,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryLiquidity.set(input.tokenId, metric);

    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('analytics_liquidity_metrics').insert({
        id: metric.id,
        token_id: metric.tokenId,
        volume_24h_usd: metric.volume24hUsd,
        trades_count_24h: metric.tradesCount24h,
        turnover_rate_pct: metric.turnoverRatePct,
        bid_ask_spread_pct: metric.bidAskSpreadPct,
        order_book_depth_usd: metric.orderBookDepthUsd,
        recorded_at: metric.recordedAt,
      });
    } catch {
      // Offline fallback
    }

    return metric;
  }

  /** Get liquidity metrics for a token */
  async getLiquidityMetrics(tokenId: string): Promise<LiquidityMetrics | null> {
    return this.memoryLiquidity.get(tokenId) ?? null;
  }

  /** Record investor cohort analytics */
  async recordInvestorMetrics(input: {
    tokenId?: string;
    totalActiveInvestors: number;
    averageCheckSizeUsd: number;
    medianCheckSizeUsd: number;
    retailInvestorCount: number;
    institutionalInvestorCount: number;
    retentionRatePct?: number;
    geographicBreakdown?: Record<string, number>;
    cohortMetrics?: Record<string, unknown>;
  }): Promise<InvestorCohortAnalytics> {
    const metric: InvestorCohortAnalytics = {
      id: `inv-an-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tokenId: input.tokenId ?? null,
      totalActiveInvestors: input.totalActiveInvestors,
      averageCheckSizeUsd: input.averageCheckSizeUsd,
      medianCheckSizeUsd: input.medianCheckSizeUsd,
      retailInvestorCount: input.retailInvestorCount,
      institutionalInvestorCount: input.institutionalInvestorCount,
      retentionRatePct: input.retentionRatePct ?? 100,
      geographicBreakdown: input.geographicBreakdown ?? {},
      cohortMetrics: input.cohortMetrics ?? {},
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.memoryInvestorMetrics.unshift(metric);
    return metric;
  }

  /** Get investor analytics */
  async getInvestorMetrics(tokenId?: string): Promise<InvestorCohortAnalytics | null> {
    if (tokenId) {
      const found = this.memoryInvestorMetrics.find((m) => m.tokenId === tokenId);
      if (found) return found;
    }
    return this.memoryInvestorMetrics.length > 0 ? this.memoryInvestorMetrics[0] : null;
  }
}
