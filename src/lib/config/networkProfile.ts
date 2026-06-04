/**
 * Testnet vs mainnet profile — same code paths, stricter gates on mainnet.
 * Set RWA_NETWORK_PROFILE=testnet (default) or mainnet.
 */

export type NetworkProfileName = 'testnet' | 'mainnet';

export interface NetworkProfile {
  name: NetworkProfileName;
  defaultChainId: number;
  l2Network: 'sepolia' | 'base-sepolia' | 'arbitrum-sepolia' | 'optimism-sepolia';
  /** Intelligence human approval required before pipeline continues */
  requireIntelligenceHumanApproval: boolean;
  /** Auto-approve agent runs (smoke CI / testnet only) */
  intelligenceAutoApproveDefault: boolean;
  /** Twin gate: mainnet requires anchored tx; testnet allows pending + contract configured */
  requireAnchoredTwinOnChain: boolean;
  /** API may return testnet deploy runbook when user confirms deploy */
  allowTestnetDeployInstructions: boolean;
  /** Use testnet fixture data when external API keys missing */
  useIntegrationFixtures: boolean;
}

const TESTNET: NetworkProfile = {
  name: 'testnet',
  defaultChainId: 11155111,
  l2Network: 'sepolia',
  requireIntelligenceHumanApproval: false,
  intelligenceAutoApproveDefault: true,
  requireAnchoredTwinOnChain: false,
  allowTestnetDeployInstructions: true,
  useIntegrationFixtures: true,
};

const MAINNET: NetworkProfile = {
  name: 'mainnet',
  defaultChainId: 1,
  l2Network: 'base-sepolia', // placeholder until mainnet L2 chosen
  requireIntelligenceHumanApproval: true,
  intelligenceAutoApproveDefault: false,
  requireAnchoredTwinOnChain: true,
  allowTestnetDeployInstructions: false,
  useIntegrationFixtures: false,
};

export function resolveNetworkProfile(
  envValue?: string
): NetworkProfile {
  const v = (envValue ?? process.env?.RWA_NETWORK_PROFILE ?? 'testnet').toLowerCase();
  return v === 'mainnet' ? MAINNET : TESTNET;
}

export function isTestnetProfile(profile: NetworkProfile = resolveNetworkProfile()): boolean {
  return profile.name === 'testnet';
}
