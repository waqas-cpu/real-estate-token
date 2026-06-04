import { config } from './config.js';
import { createApp } from './app.js';
import { validateProductionStartup } from './startup/validateProduction.js';

validateProductionStartup();

const app = createApp();
const server = app.listen(config.port, () => {
  const base = `http://localhost:${config.port}`;
  if (config.serveFrontend) {
    console.log(`RWA app (UI + API) [${config.nodeEnv}] ${base}`);
    console.log(`  Open in browser: ${base}`);
  } else {
    console.log(`RWA backend [${config.nodeEnv}] ${base}`);
    console.log(`  API only — run "npm run start" from repo root for combined UI`);
  }
  console.log(
    config.allowSmartContractDeploy
      ? 'Smart contract deploy: env enabled (manual deploy still required)'
      : 'Smart contract deploy: blocked'
  );
  console.log(
    config.allowTokenEconomicsApply
      ? 'Token economics: apply enabled (userConfirmedEconomics required per request)'
      : 'Token economics: apply blocked — set ALLOW_TOKEN_ECONOMICS_APPLY=true'
  );
});

function shutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
