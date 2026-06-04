import { IntelligenceLayerOrchestrator } from '../../../../src/lib/layers/IntelligenceLayer.js';
import { resolveNetworkProfile } from '../../../../src/lib/config/networkProfile.js';

const JURISDICTIONS = ['US', 'UK', 'EU', 'UAE', 'SG'] as const;

export class JurisdictionComplianceService {
  private intel = new IntelligenceLayerOrchestrator();

  listSupportedJurisdictions(): string[] {
    return [...JURISDICTIONS];
  }

  async resolveRulesForTransfer(input: {
    issuerJurisdiction: string;
    fromJurisdiction: string;
    toJurisdiction: string;
  }) {
    const profile = resolveNetworkProfile();
    const rules = await this.intel.processInvestor('0x0', input.issuerJurisdiction);
    const applicable = rules.rules.filter(
      (r) =>
        r.jurisdiction === input.issuerJurisdiction ||
        r.jurisdiction === input.fromJurisdiction ||
        r.jurisdiction === input.toJurisdiction
    );

    return {
      profile: profile.name,
      jurisdictions: input,
      rules: applicable.length ? applicable : rules.rules,
      transferAllowed:
        input.fromJurisdiction !== 'XX' && input.toJurisdiction !== 'XX',
      mainnetRequiresLegalReview: profile.name === 'mainnet',
    };
  }
}
