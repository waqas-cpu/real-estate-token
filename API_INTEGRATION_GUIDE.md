# API Integration Guide

**Version**: 1.0.0  
**Status**: Ready for Development  
**Last Updated**: 2026-05-29

---

## Overview

This guide explains how the frontend integrates with the Supabase backend for the RealEstate Token platform. The integration provides a complete data layer connecting all 7 pages to backend services.

---

## Architecture

### Data Flow

```
React Component
    ↓
Custom Hook (useAssets, useKYCStatus, etc.)
    ↓
API Service (src/lib/api.ts)
    ↓
Supabase Client
    ↓
PostgreSQL Database
```

### Authentication Flow

```
1. User visits app → LoginPage
2. Enter email/password → Sign up or Sign in
3. Supabase auth.signUp() / auth.signInWithPassword()
4. JWT token stored in session
5. AuthContext updates with user data
6. Redirect to Dashboard
7. All API calls include auth token automatically
```

---

## Setup Instructions

### 1. Environment Variables

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from Supabase Dashboard:
- Settings → API → Project URL
- Settings → API → Project API keys → anon key

### 2. Database Requirements

All tables must exist (already created via migration):
- `physical_assets` - Real estate properties
- `security_tokens` - Tokenized assets
- `kyc_records` - Investor verification
- `governance_proposals` - DAO voting
- `income_distributions` - Yield payouts
- `valuations` - Property valuations
- `risk_scores` - Risk assessments
- And 10 others (see schema)

All tables have RLS (Row Level Security) enabled. Configure policies as needed.

### 3. Enable Auth

Supabase Auth is enabled by default. Users can:
- Sign up with email/password
- Sign in with email/password
- JWT tokens auto-refreshed

---

## API Reference

### Authentication

```typescript
// src/lib/api.ts

// Sign up new user
async signUp(email: string, password: string): Promise<AuthResponse>

// Sign in existing user
async signIn(email: string, password: string): Promise<AuthResponse>

// Sign out current user
async signOut(): Promise<void>

// Get current authenticated user
async getCurrentUser(): Promise<User | null>

// Listen for auth state changes
async onAuthStateChange(callback: (event: string, session: any) => void): Subscription
```

### Asset APIs

```typescript
// Fetch all verified assets
async getAssets(): Promise<PhysicalAsset[]>

// Get specific asset by ID
async getAssetById(id: string): Promise<PhysicalAsset | null>

// Get asset valuation
async getAssetValuation(assetId: string): Promise<Valuation | null>

// Get asset risk score
async getAssetRiskScore(assetId: string): Promise<RiskScore | null>
```

### Security Token APIs

```typescript
// Fetch all security tokens
async getSecurityTokens(): Promise<SecurityToken[]>

// Get specific token
async getSecurityTokenById(id: string): Promise<SecurityToken | null>

// Get token offering details
async getTokenOffering(tokenId: string): Promise<TokenOffering | null>
```

### KYC & Compliance APIs

```typescript
// Get KYC status for investor
async getKYCStatus(wallet: string): Promise<KYCRecord | null>

// Update KYC status
async updateKYCStatus(
  wallet: string,
  updates: Partial<KYCRecord>
): Promise<KYCRecord | null>
```

### Governance APIs

```typescript
// Get proposals for token
async getProposals(tokenId: string): Promise<GovernanceProposal[]>

// Get specific proposal
async getProposalById(id: string): Promise<GovernanceProposal | null>

// Create new proposal
async createProposal(
  proposal: Omit<GovernanceProposal, 'id' | 'created_at'>
): Promise<GovernanceProposal | null>
```

### Income Distribution APIs

```typescript
// Get distributions for token
async getDistributions(tokenId: string): Promise<IncomeDistribution[]>

// Get specific distribution
async getDistributionById(id: string): Promise<IncomeDistribution | null>
```

---

## Data Hooks

Pre-built React hooks for common queries:

```typescript
// src/lib/hooks.ts

// Fetch all assets
const { data: assets, loading, error } = useAssets();

// Fetch single asset
const { data: asset, loading, error } = useAssetById(assetId);

// Fetch asset valuation
const { data: valuation, loading, error } = useAssetValuation(assetId);

// Fetch security tokens
const { data: tokens, loading, error } = useSecurityTokens();

// Fetch token offering
const { data: offering, loading, error } = useTokenOffering(tokenId);

// Fetch proposals
const { data: proposals, loading, error } = useProposals(tokenId);

// Fetch distributions
const { data: distributions, loading, error } = useDistributions(tokenId);

// Fetch KYC status
const { data: kyc, loading, error } = useKYCStatus(wallet);
```

Each hook returns: `{ data: T | null, loading: boolean, error: Error | null }`

---

## Usage Examples

### Example 1: Fetch Assets in Marketplace

```typescript
import { useAssets } from '../lib/hooks';

function AssetMarketplace() {
  const { data: assets, loading, error } = useAssets();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {assets?.map(asset => (
        <div key={asset.id}>
          <h3>{asset.title}</h3>
          <p>{asset.address}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Get KYC Status

```typescript
import { useAuth } from '../lib/AuthContext';
import { useKYCStatus } from '../lib/hooks';

function KYCPage() {
  const { user } = useAuth();
  const { data: kyc, loading } = useKYCStatus(user?.email || null);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Status: {kyc?.accreditated ? 'Verified' : 'Pending'}</p>
      <p>Jurisdictions: {kyc?.jurisdictions?.join(', ')}</p>
    </div>
  );
}
```

### Example 3: Create Proposal

```typescript
import { createProposal } from '../lib/api';

async function submitProposal(tokenId: string, title: string) {
  try {
    const proposal = await createProposal({
      token_id: tokenId,
      proposer: userId,
      title,
      description: '',
      proposal_type: 'CAPEX',
      status: 'PENDING',
    });
    console.log('Created:', proposal);
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

---

## Authentication Context

Access current user and auth methods anywhere in app:

```typescript
import { useAuth } from '../lib/AuthContext';

function MyComponent() {
  const { user, userRole, loading, signOut, setUserRole } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <LoginPage />;

  return (
    <div>
      <p>Welcome, {user.email}</p>
      <p>Role: {userRole}</p>
      <button onClick={() => signOut()}>Sign Out</button>
      <select value={userRole} onChange={(e) => setUserRole(e.target.value as any)}>
        <option value="investor">Investor</option>
        <option value="issuer">Issuer</option>
        <option value="admin">Admin</option>
      </select>
    </div>
  );
}
```

---

## Error Handling

All API functions throw errors. Handle them:

```typescript
import { getAssets } from '../lib/api';

async function fetchAssets() {
  try {
    const assets = await getAssets();
    // Success
  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', error.message);
      // Handle specific errors:
      if (error.message.includes('RLS')) {
        // RLS policy rejected access
      } else if (error.message.includes('auth')) {
        // Auth error - redirect to login
      }
    }
  }
}
```

---

## Row Level Security (RLS)

Most tables have RLS enabled. Policies restrict data access:

**Policies Currently Enforced:**
- Users can view public asset data
- Users can only view their own KYC records
- Users can only vote with tokens they own
- Admin-only actions require admin role in JWT

### Adding RLS Policies

Example: Allow investors to view portfolio holdings

```sql
CREATE POLICY "Investors view own holdings"
  ON security_tokens FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());
```

---

## Type Safety

All data is fully typed:

```typescript
import type {
  PhysicalAsset,
  SecurityToken,
  KYCRecord,
  GovernanceProposal,
  IncomeDistribution,
  Valuation,
  RiskScore,
} from '../lib/api';

const asset: PhysicalAsset = {
  id: '123',
  title: 'London House',
  address: '10 Downing St',
  // ... all properties required
};
```

---

## Real-time Updates

Enable real-time subscription:

```typescript
import { supabase } from '../lib/supabase';

function useRealTimeAssets() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const subscription = supabase
      .from('physical_assets')
      .on('*', (payload) => {
        // Handle INSERT, UPDATE, DELETE
        console.log('Change:', payload);
        // Update local state
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return assets;
}
```

---

## Performance Optimization

### Pagination

For large datasets:

```typescript
const { data, error } = await supabase
  .from('physical_assets')
  .select('*')
  .range(0, 24); // First 25 records
```

### Filtering & Sorting

```typescript
const { data } = await supabase
  .from('physical_assets')
  .select('*')
  .eq('verified', true)
  .gt('square_feet', 5000)
  .order('created_at', { ascending: false })
  .limit(10);
```

### Index Queries

Ensure frequently queried columns are indexed:
- `physical_assets.verified`
- `security_tokens.asset_id`
- `kyc_records.investor_wallet`
- `governance_proposals.token_id`

---

## Testing API Integration

### Manual Testing

1. Sign up with test email
2. Navigate to each page
3. Verify data loads from database
4. Test error states (simulate network error)
5. Test pagination and filtering

### Integration Testing

```typescript
// Example with Vitest
import { describe, it, expect } from 'vitest';
import { getAssets } from '../lib/api';

describe('API Integration', () => {
  it('fetches verified assets', async () => {
    const assets = await getAssets();
    expect(Array.isArray(assets)).toBe(true);
    expect(assets.length).toBeGreaterThan(0);
  });
});
```

---

## Common Issues & Solutions

### Issue: Auth token expires

**Solution**: AuthContext auto-refreshes tokens. Implement logout redirect on 401:

```typescript
const response = await fetch('/api/data', {
  headers: { Authorization: `Bearer ${token}` }
});

if (response.status === 401) {
  // Token expired, redirect to login
  window.location.href = '/login';
}
```

### Issue: RLS policy blocks query

**Solution**: Verify the current user matches the policy condition:

```typescript
// Policy expects: user_id = auth.uid()
// Your query uses: WHERE user_id = '123'
// Ensure '123' matches current auth.uid()
```

### Issue: Empty results

**Solution**: Check if data exists in database:

```typescript
// Test the query directly in Supabase SQL editor
SELECT * FROM physical_assets WHERE verified = true;
```

---

## Deployment Checklist

- [ ] Environment variables configured on hosting platform
- [ ] Supabase project accessible (firewall/CORS rules)
- [ ] RLS policies reviewed and tested
- [ ] Auth redirect URLs added to Supabase
- [ ] Database backups scheduled
- [ ] Monitoring/logging configured
- [ ] Error tracking (Sentry) setup
- [ ] Load testing completed

---

## Next Steps

1. **Data Population**: Load test data into tables
2. **API Testing**: Verify all endpoints work
3. **Component Updates**: Connect pages to real data
4. **Performance Testing**: Optimize queries
5. **Security Audit**: Review RLS policies
6. **Production Deploy**: Deploy to hosting

---

## Reference

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
