# Approved Token Economics (Platform Policy)

**Status:** Issuer-confirmed · codified in `backend/src/config/platformTokenEconomics.ts`

## Fixed rules per property

| Rule | Value |
|------|--------|
| **Total supply** | **30,000** tokens (fixed) |
| **Token price** | Property FMV (USD) ÷ 30,000, settled in **USDC** |
| **Max per investor** | **3,000** tokens (**10%** of supply) per property |
| **Full-stake discount** | **10% off** USDC when buying **3,000** tokens in one subscription |
| **Annual yield** | **10%** × (tokens held × token price) = 10% of USDC invested |
| **Distribution** | **Monthly** · **10%** platform fee · **90%** to holders (pro-rata by tokens) |

## Examples

Property FMV = **$3,000,000 USDC**

- Token price = $3,000,000 ÷ 30,000 = **$100 USDC** per token  
- Max investor stake = 3,000 × $100 = **$300,000** list  
- With full 10% discount = **$270,000 USDC** paid  
- List price 3,000 × $100 = **$300,000** → with 10% full-stake discount pay **$270,000 USDC**  
- Projected annual yield = 10% × $300,000 invested = **$30,000 / year**  
- Monthly yield ≈ **$2,500 / month** (projected, from rental distributions)  
- If gross rent = $50,000/month → platform fee $5,000 → pool $45,000 → holder with 3,000 tokens receives **$45,000** (100% of pool)

Investor with **300** tokens (1%):

- Pay = 300 × $100 = **$30,000 USDC** (no full-stake discount)  
- Annual yield = 10% × $30,000 = **$3,000**  
- Monthly distribution share = 90% pool × (300/30000) = **1%** of distributable rent

## API usage

```http
GET  /api/token-economics/platform-policy
POST /api/token-economics/preview        { "assetId": "..." }
POST /api/token-economics/quote          { "assetId": "...", "tokenCount": 3000 }
POST /api/admin/tokenize                 { "assetId", "symbol", "userConfirmedEconomics": true }
POST /api/offerings                      { "tokenId", "assetId", "startDate", "endDate", "userConfirmedEconomics": true }
POST /api/investments/subscribe          { "offeringId", "investorWallet", "tokenCount": 3000 }
POST /api/distributions/preview          { "tokenId", "grossRentUsdcMicro": "..." }
POST /api/distributions                  { "tokenId", "grossRentUsdcMicro", ..., "userConfirmedEconomics": true }
```

Enable writes: `ALLOW_TOKEN_ECONOMICS_APPLY=true` in `backend/.env`.

## Compliance module (on-chain, when deployed)

Register with metadata: `MaxBalanceModule:10PercentPerInvestor` → max balance = 3,000 tokens (10% of 30,000).
