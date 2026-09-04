import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { SmartContractGuardError } from './services/ExecutionService.js';
import { TokenEconomicsGuardError } from './services/TokenEconomicsService.js';
import {
  apiRateLimiter,
  sensitiveActionRateLimiter,
  securityHeaders,
  requestLogger,
} from './middleware/production.js';
import { auditApiMutations } from './middleware/auditApi.js';
import { optionalAuth } from './middleware/auth.js';

import healthRouter from './routes/health.js';
import assetsRouter from './routes/assets.js';
import marketplaceRouter from './routes/marketplace.js';
import kycRouter from './routes/kyc.js';
import governanceRouter from './routes/governance.js';
import adminRouter from './routes/admin.js';
import executionRouter from './routes/execution.js';
import portfolioRouter from './routes/portfolio.js';
import distributionsRouter from './routes/distributions.js';
import userRouter from './routes/user.js';
import investmentsRouter from './routes/investments.js';
import gatesRouter from './routes/gates.js';
import tokenEconomicsRouter from './routes/tokenEconomics.js';
import offeringsRouter from './routes/offerings.js';
import blockchainRouter from './routes/blockchain.js';
import intelligenceRouter, {
  handleAgentApprovalError,
} from './routes/intelligence.js';
import regulatoryRouter from './routes/regulatory.js';
import anchorsRouter from './routes/anchors.js';
import databaseLayersRouter from './routes/databaseLayers.js';
import { createRwaCrudRouter } from './modules/crud/routes/crudRouter.js';
import { AgentApprovalRequiredError } from './services/IntelligenceAgentService.js';
import { mountFrontend } from './mountFrontend.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(requestLogger);

  const corsOrigins = config.corsOrigin.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.use('/health', healthRouter);
  app.use('/api', apiRateLimiter);
  app.use('/api/admin/emergency', sensitiveActionRateLimiter);
  app.use('/api/admin/multisig', sensitiveActionRateLimiter);
  app.use('/api/kyc/whitelist', sensitiveActionRateLimiter);
  app.use('/api', optionalAuth);
  app.use('/api', auditApiMutations);

  // Mount production-grade RWA CRUD architecture routers
  const rwaCrudRouter = createRwaCrudRouter();
  app.use('/api/v1', rwaCrudRouter);
  app.use('/api/crud', rwaCrudRouter);

  app.use('/api/assets', assetsRouter);
  app.use('/api/marketplace', marketplaceRouter);
  app.use('/api/kyc', kycRouter);
  app.use('/api/governance', governanceRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/execution', executionRouter);
  app.use('/api/portfolio', portfolioRouter);
  app.use('/api/distributions', distributionsRouter);
  app.use('/api/user', userRouter);
  app.use('/api/investments', investmentsRouter);
  app.use('/api/gates', gatesRouter);
  app.use('/api/token-economics', tokenEconomicsRouter);
  app.use('/api/offerings', offeringsRouter);
  app.use('/api/blockchain', blockchainRouter);
  app.use('/api/intelligence', intelligenceRouter);
  app.use('/api/regulatory', regulatoryRouter);
  app.use('/api/anchors', anchorsRouter);
  app.use('/api/v1/database', databaseLayersRouter);
  app.use('/api/database', databaseLayersRouter);

  if (config.serveFrontend) {
    mountFrontend(app, config.frontendDist);
  }

  app.use(
    (
      err: Error & { issues?: unknown },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err.name === 'ZodError') {
        res.status(400).json({ error: 'Validation failed', details: err.issues });
        return;
      }
      if (err instanceof SmartContractGuardError) {
        res.status(403).json({ code: err.code, error: err.message });
        return;
      }
      if (err instanceof TokenEconomicsGuardError) {
        res.status(403).json({ code: err.code, error: err.message });
        return;
      }
      if (err instanceof AgentApprovalRequiredError) {
        handleAgentApprovalError(err, _req, res, _next);
        return;
      }
      if (err.message?.includes('Gate crossing failed')) {
        res.status(422).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
      });
    }
  );

  return app;
}
