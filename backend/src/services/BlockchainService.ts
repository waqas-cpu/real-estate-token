import { config } from '../config.js';

import { loadTestnetDeployment } from '../integrations/blockchain.js';



export class BlockchainService {

  getTestnetStatus() {

    const deployment = loadTestnetDeployment();

    return {

      network: 'sepolia',

      standard: deployment?.standard ?? 'ERC-3643',

      trexVersion: deployment?.trexVersion ?? '4.1.3',

      rpcConfigured: Boolean(config.sepoliaRpcUrl),

      deployment,

      mainnetBlocked: true,

      message:

        deployment

          ? 'ERC-3643 (T-REX) testnet deployed — register via POST /api/admin/tokenize'

          : 'Run: npm run deploy:testnet (requires DEPLOYER_PRIVATE_KEY + SEPOLIA_RPC_URL)',

    };

  }



  getRegisterPayloadFromDeployment(symbol: string) {

    const d = loadTestnetDeployment();

    if (!d) return null;

    return {

      contractAddress: d.contracts.rwaToken,

      trexIdentityRegistry: d.contracts.identityRegistry ?? d.contracts.primaryOffering,

      escrowContractAddr: d.contracts.primaryOffering,

      mockUsdc: d.contracts.mockUsdc,

      trexFactory: d.contracts.trexFactory ?? d.infrastructure?.trexFactory,

      modularCompliance: d.contracts.modularCompliance,

      maxBalanceModule: d.contracts.maxBalanceModule,

      symbol,

      totalSupply: String(d.economics.fixedTotalSupply ?? 30000),

      complianceModules: [

        'ERC-3643',

        'T-REX',

        `MaxBalanceModule:${d.economics.maxTokensPerInvestor ?? 3000}`,

        'USDC',

        'PrimaryOfferingTREX',

      ],

    };

  }

}

