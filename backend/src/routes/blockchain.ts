import { Router } from 'express';
import { BlockchainService } from '../services/BlockchainService.js';
import { L2_CHAIN_IDS } from '../../../src/lib/crypto/pqc/l2Settlement.js';

const router = Router();
const chain = new BlockchainService();

router.get('/pqc', (_req, res) => {
  res.json({
    status: 'ready',
    library: '@noble/post-quantum',
    algorithms: {
      signing: 'ML-DSA-87 (FIPS 204)',
      kem: 'ML-KEM-1024 (FIPS 203)',
      backupSigning: 'SLH-DSA-SHA2-256f (FIPS 205)',
      hybridChannel: 'ML-KEM-768 + X25519 (L2 relayer)',
    },
    l2Networks: L2_CHAIN_IDS,
    env: {
      platformSeedConfigured: !!process.env.PQC_PLATFORM_SEED,
      oracleSeedConfigured: !!process.env.PQC_ORACLE_SEED,
    },
  });
});

router.get('/testnet', (_req, res) => {
  res.json(chain.getTestnetStatus());
});

router.get('/testnet/register-hint', (req, res) => {
  const symbol = (req.query.symbol as string) || 'RWAT';
  const hint = chain.getRegisterPayloadFromDeployment(symbol);
  if (!hint) {
    res.status(404).json({
      error: 'No deployment file found. Run npm run deploy:testnet first.',
    });
    return;
  }
  res.json(hint);
});

export default router;
