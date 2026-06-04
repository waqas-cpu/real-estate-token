import { Router } from 'express';
import { z } from 'zod';
import {
  ExecutionService,
  SmartContractGuardError,
} from '../services/ExecutionService.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = Router();
const execution = new ExecutionService();

/**
 * Smart contract deployment endpoint — always guarded.
 * You must set ALLOW_SMART_CONTRACT_DEPLOY=true AND userConfirmedDeploy:true
 * before this returns anything other than an approval message.
 */
router.post('/deploy-request', optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const body = z
      .object({
        assetId: z.string().uuid(),
        symbol: z.string(),
        network: z.enum(['localhost', 'sepolia', 'mainnet']),
        userConfirmedDeploy: z.literal(true),
      })
      .parse(req.body);

    const result = await execution.requestContractDeployment(body);
    res.json(result);
  } catch (err) {
    if (err instanceof SmartContractGuardError) {
      res.status(403).json({
        code: err.code,
        error: err.message,
        actionRequired:
          'Contact platform owner to approve smart contract deployment. No contracts will be deployed automatically.',
      });
      return;
    }
    next(err);
  }
});

router.get('/deployment-policy', (_req, res) => {
  res.json({
    automaticDeployment: false,
    requiresEnvFlag: 'ALLOW_SMART_CONTRACT_DEPLOY=true',
    requiresRequestFlag: 'userConfirmedDeploy: true',
    ownerApprovalRequired: true,
    message:
      'Smart contract build and deploy are NOT performed by this backend without your explicit configuration and confirmation.',
    recommendedFlow: [
      '1. POST /api/assets/pipeline with userConfirmedEconomics: true (all 4 layers)',
      '2. npm run deploy:testnet then re-run pipeline to link sepolia.json',
      '3. Optional userConfirmedDeploy: true for Hardhat deploy instructions',
      '4. POST /api/offerings then /api/investments/subscribe',
      '5. Never enable mainnet until security audit is complete',
    ],
  });
});

export default router;
