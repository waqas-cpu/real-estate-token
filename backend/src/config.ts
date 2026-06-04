import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveNetworkProfile,
  type NetworkProfile,
} from '../../src/lib/config/networkProfile.js';
import { frontendBuildExists, resolveFrontendDist } from './mountFrontend.js';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

const networkProfile = resolveNetworkProfile(process.env.RWA_NETWORK_PROFILE);

export const config = {
  networkProfile,
  rwaNetworkProfile: networkProfile.name,
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
  corsOrigin: optional('CORS_ORIGIN', 'http://localhost:3001'),
  /** Serve built React app from repo /dist on the same port as the API */
  serveFrontend:
    process.env.SERVE_FRONTEND === 'true' ||
    (process.env.SERVE_FRONTEND !== 'false' && frontendBuildExists()),
  frontendDist: resolveFrontendDist(),
  backendDir,
  /** Must be explicitly true to allow any on-chain deployment helpers */
  allowSmartContractDeploy:
    process.env.ALLOW_SMART_CONTRACT_DEPLOY === 'true',
  /** Token supply, price, raises — requires owner confirmation */
  allowTokenEconomicsApply:
    process.env.ALLOW_TOKEN_ECONOMICS_APPLY === 'true',
  /** Phase 8 production hardening */
  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMax: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
  logRequests: process.env.LOG_REQUESTS === 'true',
  auditApiCalls: process.env.AUDIT_API_CALLS === 'true',
  sentryDsn: process.env.SENTRY_DSN ?? '',
  ipfsGateway: optional('IPFS_GATEWAY', 'https://gateway.pinata.cloud'),
  chainlinkApiKey: process.env.CHAINLINK_API_KEY ?? '',
  pythApiKey: process.env.PYTH_API_KEY ?? '',
  pinataJwt: process.env.PINATA_JWT ?? '',
  pinataApiKey: process.env.PINATA_API_KEY ?? '',
  sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL ?? '',
  chainDeploymentFile: process.env.CHAIN_DEPLOYMENT_FILE ?? '',
  /** mainnet deploy must stay false until audit */
  allowMainnetDeploy: process.env.ALLOW_MAINNET_DEPLOY === 'true',

  /** Agentic intelligence (tool loop + trace) — default on */
  intelligenceAgentMode: process.env.INTELLIGENCE_AGENT_MODE !== 'false',
  intelligenceRequireHumanApproval:
    process.env.INTELLIGENCE_REQUIRE_HUMAN_APPROVAL !== undefined
      ? process.env.INTELLIGENCE_REQUIRE_HUMAN_APPROVAL !== 'false'
      : networkProfile.requireIntelligenceHumanApproval,
  intelligenceAutoApprove:
    process.env.INTELLIGENCE_AUTO_APPROVE !== undefined
      ? process.env.INTELLIGENCE_AUTO_APPROVE === 'true'
      : networkProfile.intelligenceAutoApproveDefault,

  /** Optional LLM synthesis (OpenAI-compatible) */
  openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY ?? '',
  openaiModel: optional(
    'OPENAI_MODEL',
    process.env.GROQ_MODEL ?? 'gpt-4o-mini'
  ),
  openaiBaseUrl: optional(
    'OPENAI_BASE_URL',
    process.env.GROQ_BASE_URL ?? 'https://api.openai.com/v1'
  ),

  /** Sumsub KYC webhooks */
  sumsubWebhookSecret: process.env.SUMSUB_WEBHOOK_SECRET ?? '',
  sumsubAppToken: process.env.SUMSUB_APP_TOKEN ?? '',

  /** Registry / oracle / MLS — live URLs override testnet fixtures when set */
  hmLandRegistryUrl: process.env.HM_LAND_REGISTRY_URL ?? '',
  accreditationRegistryUrl: process.env.ACCREDITATION_REGISTRY_URL ?? '',
};

export function getNetworkProfile(): NetworkProfile {
  return config.networkProfile;
}

export function assertSupabaseConfig(): void {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. See backend/.env.example'
    );
  }
}
