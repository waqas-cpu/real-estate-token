import { config, assertSupabaseConfig } from '../config.js';

export function validateProductionStartup(): void {
  const isProd = config.nodeEnv === 'production';

  if (isProd) {
    assertSupabaseConfig();
    if (!config.supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is required in production (JWT validation)');
    }
    if (!config.corsOrigin || config.corsOrigin === 'http://localhost:5173') {
      console.warn(
        'Warning: CORS_ORIGIN is still localhost — set to your production frontend URL'
      );
    }
  }

  const warnings: string[] = [];
  if (!config.allowTokenEconomicsApply) {
    warnings.push('ALLOW_TOKEN_ECONOMICS_APPLY=false — offering/token writes will return 403');
  }
  if (config.allowSmartContractDeploy) {
    warnings.push('ALLOW_SMART_CONTRACT_DEPLOY=true — ensure contracts are audited');
  }
  if (!config.sentryDsn && isProd) {
    warnings.push('SENTRY_DSN not set — add error monitoring for production');
  }

  for (const w of warnings) {
    console.warn(`[startup] ${w}`);
  }
}
