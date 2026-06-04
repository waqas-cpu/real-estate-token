import { getSupabaseAdmin } from '../../supabase.js';
import { resolveNetworkProfile } from '../../../../src/lib/config/networkProfile.js';

export type AccreditationRegistry = 'SEC_EDGAR' | 'FCA' | 'MANUAL' | 'TESTNET_FIXTURE';

export class AccreditationService {
  async checkAccreditation(
    investorWallet: string,
    jurisdiction: string
  ): Promise<{ accredited: boolean; registry: AccreditationRegistry; expiresAt: Date }> {
    const profile = resolveNetworkProfile();
    const registry: AccreditationRegistry =
      profile.name === 'testnet' ? 'TESTNET_FIXTURE' : jurisdiction === 'US' ? 'SEC_EDGAR' : 'FCA';

    let accredited = false;
    if (profile.useIntegrationFixtures) {
      accredited = !investorWallet.toLowerCase().includes('unaccredited');
    } else {
      const url = process.env.ACCREDITATION_REGISTRY_URL;
      if (url) {
        try {
          const res = await fetch(
            `${url}?wallet=${encodeURIComponent(investorWallet)}&jurisdiction=${jurisdiction}`
          );
          if (res.ok) {
            const body = (await res.json()) as { accredited?: boolean };
            accredited = Boolean(body.accredited);
          }
        } catch {
          accredited = false;
        }
      }
    }

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const supabase = getSupabaseAdmin();
    await supabase.from('accreditation_checks').upsert(
      {
        investor_wallet: investorWallet,
        registry_source: registry,
        accredited,
        expires_at: expiresAt.toISOString(),
        evidence_ref: profile.name === 'testnet' ? 'fixture-v1' : null,
      },
      { onConflict: 'investor_wallet,registry_source' }
    );

    return { accredited, registry, expiresAt };
  }
}
