import { describe, it, expect } from 'vitest';
import { TokenEconomicsService } from '../src/services/TokenEconomicsService.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../src/config/platformTokenEconomics.js';

describe('Platform token economics', () => {
  const svc = new TokenEconomicsService();

  it('fixes supply at 30,000', () => {
    expect(() => svc.validateSupply('29999')).toThrow(/30000/);
    expect(() => svc.validateSupply('30000')).not.toThrow();
  });

  it('computes USDC price as FMV / 30000', () => {
    const price = svc.computeTokenPriceUsdcMicro(3_000_000);
    expect(price).toBe(100_000_000n);
  });

  it('applies 10% discount on full 3,000-token stake', () => {
    const price = svc.computeTokenPriceUsdcMicro(3_000_000);
    const full = svc.computeSubscriptionUsdcMicro(3000, price);
    const partial = svc.computeSubscriptionUsdcMicro(100, price);
    expect(full.discountPercent).toBe(10);
    expect(full.usdcMicro).toBe((full.listUsdcMicro * 90n) / 100n);
    expect(partial.discountPercent).toBe(0);
  });

  it('computes annual yield as 10% of USDC invested (tokens × price)', () => {
    const yield3000 = svc.computeAnnualYieldUsdcMicro(3000, 3_000_000);
    expect(yield3000).toBe(30_000_000_000n);
    const yield300 = svc.computeAnnualYieldUsdcMicro(300, 3_000_000);
    expect(yield300).toBe(3_000_000_000n);
  });

  it('splits monthly rent 90/10', () => {
    const gross = 1_000_000_000n;
    const { platformFeeMicro, distributableMicro } =
      svc.splitMonthlyDistribution(gross);
    expect(platformFeeMicro).toBe(100_000_000n);
    expect(distributableMicro).toBe(900_000_000n);
  });

  it('distributes pro-rata by tokens held', () => {
    const holder = svc.computeHolderDistributionMicro(900_000_000n, 3000);
    expect(holder).toBe(90_000_000n);
    expect(PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor).toBe(3000);
  });
});
