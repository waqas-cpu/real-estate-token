/**
 * EXECUTION LAYER — on-chain settlement linked to prior layers via API pipeline.
 *
 * Contract deploy from the API server is still blocked unless ALLOW_SMART_CONTRACT_DEPLOY=true
 * AND userConfirmedDeploy: true. Registration + EXECUTION→DATA feedback run after the
 * SECURITY→EXECUTION gate in PipelineService.
 */

import { config } from '../config.js';
import { PLATFORM_TOKEN_ECONOMICS } from '../config/platformTokenEconomics.js';
import { getSupabaseAdmin } from '../supabase.js';
import { crossGate } from '../../../src/lib/gates/integrationGates.js';
import {
  TokenEconomicsService,
  TokenEconomicsGuardError,
} from './TokenEconomicsService.js';
import { BlockchainService } from './BlockchainService.js';

export type DeployNetwork = 'localhost' | 'sepolia' | 'mainnet';

export interface TokenRegistrationInput {
  assetId: string;
  symbol: string;
  totalSupply: string;
  decimals?: number;
  creatorId: string;
  complianceModules: string[];
  contractAddress?: string;
  trexIdentityRegistry?: string;
  userConfirmedEconomics?: boolean;
}

export interface DeploymentRequest {
  assetId: string;
  symbol: string;
  network: DeployNetwork;
  /** Must be true — explicit human confirmation */
  userConfirmedDeploy: boolean;
}

/** Payload from PipelineService after SECURITY layer (SECURITY→EXECUTION gate already passed). */
export interface L2PqcSettlementProof {
  network: string;
  chainId: number;
  intentHash: string;
  signatureML_DSA: string;
  publicKeyEnc: string;
}

export interface ExecutionPipelineInput {
  assetId: string;
  symbol: string;
  creatorId: string;
  investorWallet: string;
  userConfirmedEconomics: boolean;
  userConfirmedDeploy?: boolean;
  network?: DeployNetwork;
  /** ML-DSA-87 authorization for L2 settlement (signed after SECURITY layer) */
  l2Settlement?: L2PqcSettlementProof;
}

export class SmartContractGuardError extends Error {
  readonly code = 'SMART_CONTRACT_DEPLOYMENT_REQUIRES_APPROVAL';

  constructor(message: string) {
    super(message);
    this.name = 'SmartContractGuardError';
  }
}

export class ExecutionService {
  private economics = new TokenEconomicsService();
  private blockchain = new BlockchainService();

  /**
   * Registers token metadata in Supabase without deploying contracts.
   */
  async registerTokenMetadata(input: TokenRegistrationInput) {
    if (!input.userConfirmedEconomics) {
      throw new TokenEconomicsGuardError(
        'totalSupply is a core economic parameter. Set userConfirmedEconomics: true after you approve token economics. ' +
          'Use GET /api/token-economics/decisions-required and POST /api/token-economics/preview first.'
      );
    }
    this.economics.assertOwnerConfirmed(true);
    this.economics.validateSupply(input.totalSupply);

    const supabase = getSupabaseAdmin();
    const contractAddress =
      input.contractAddress ?? `PENDING_DEPLOY_${input.symbol}_${Date.now()}`;

    const { data, error } = await supabase
      .from('security_tokens')
      .insert({
        asset_id: input.assetId,
        symbol: input.symbol,
        total_supply: input.totalSupply,
        decimals: input.decimals ?? PLATFORM_TOKEN_ECONOMICS.tokenDecimals,
        contract_address: contractAddress,
        trex_identity_registry: input.trexIdentityRegistry ?? null,
        compliance_modules: input.complianceModules,
        creator: input.creatorId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deployment is intentionally disabled. Returns instructions for you to deploy manually.
   */
  async requestContractDeployment(request: DeploymentRequest) {
    if (!request.userConfirmedDeploy) {
      throw new SmartContractGuardError(
        'Set userConfirmedDeploy: true only after you have reviewed and approved deployment.'
      );
    }

    if (request.network === 'mainnet') {
      if (!config.allowMainnetDeploy) {
        throw new SmartContractGuardError(
          'Mainnet deployment is blocked. Complete testnet validation and security audit first. ' +
            'Set ALLOW_MAINNET_DEPLOY=true only after audit (not recommended until then).'
        );
      }
    }

    if (!config.allowSmartContractDeploy) {
      throw new SmartContractGuardError(
        'Set ALLOW_SMART_CONTRACT_DEPLOY=true in backend/.env for testnet deploy instructions.'
      );
    }

    const testnet = this.blockchain.getTestnetStatus();
    const registerHint = this.blockchain.getRegisterPayloadFromDeployment(request.symbol);

    return {
      status: 'TESTNET_DEPLOY_VIA_HARDHAT',
      message:
        'Run contract deploy from your machine (keys never stored in API). Pipeline will auto-link addresses once sepolia.json exists.',
      network: request.network,
      assetId: request.assetId,
      symbol: request.symbol,
      steps: [
        '1. Copy contracts/.env.example → contracts/.env with DEPLOYER_PRIVATE_KEY + SEPOLIA_RPC_URL',
        '2. npm run deploy:testnet',
        '3. Re-run POST /api/assets/pipeline with userConfirmedDeploy: true',
      ],
      testnetStatus: testnet,
      registerPayloadHint: registerHint,
      mainnetNote:
        'Mainnet: see DEPLOY_MAINNET.md — audited ERC-3643 + real USDC; do not reuse Sepolia deployments.',
    };
  }

  /**
   * Layer 5 — register ERC-3643 token, link on-chain deployment file, EXECUTION→DATA feedback.
   */
  async completeExecutionFromPipeline(input: ExecutionPipelineInput) {
    const registerHint = this.blockchain.getRegisterPayloadFromDeployment(input.symbol);
    const contractAddress = registerHint?.contractAddress;
    const onChainLinked =
      !!contractAddress && !String(contractAddress).startsWith('PENDING');

    const complianceModules =
      registerHint?.complianceModules ?? [
        'ERC-3643',
        'T-REX',
        `MaxBalanceModule:${PLATFORM_TOKEN_ECONOMICS.maxTokensPerInvestor}`,
        'USDC',
        'PrimaryOfferingTREX',
      ];

    const token = await this.registerTokenMetadata({
      assetId: input.assetId,
      symbol: input.symbol,
      totalSupply: String(PLATFORM_TOKEN_ECONOMICS.fixedTotalSupply),
      decimals: PLATFORM_TOKEN_ECONOMICS.tokenDecimals,
      creatorId: input.creatorId,
      complianceModules,
      contractAddress,
      trexIdentityRegistry: registerHint?.trexIdentityRegistry,
      userConfirmedEconomics: input.userConfirmedEconomics,
    });

    const settlementRef =
      contractAddress ?? `PENDING_DEPLOY_${input.symbol}_${token.id}`;

    const feedbackBoundary = await crossGate({
      fromLayer: 'EXECUTION',
      toLayer: 'DATA',
      data: {
        transferEventHash: settlementRef,
        twinUpdatedAt: new Date(),
        merkleRoot: settlementRef,
        distributionContractAddr:
          registerHint?.escrowContractAddr ?? settlementRef,
        verifiedAt: new Date(),
      },
      actor: input.creatorId,
      timestamp: new Date(),
    });

    const supabase = getSupabaseAdmin();

    const { data: twinRow } = await supabase
      .from('digital_twins')
      .select('id, schema')
      .eq('asset_id', input.assetId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (twinRow) {
      const schema = (twinRow.schema as Record<string, unknown>) ?? {};
      await supabase
        .from('digital_twins')
        .update({
          schema: {
            ...schema,
            onChain: {
              standard: 'ERC-3643',
              tokenId: token.id,
              symbol: input.symbol,
              contractAddress: contractAddress ?? null,
              identityRegistry: registerHint?.trexIdentityRegistry ?? null,
              primaryOffering: registerHint?.escrowContractAddr ?? null,
              mockUsdc: registerHint?.mockUsdc ?? null,
              investorWallet: input.investorWallet,
              linkedAt: new Date().toISOString(),
              l2PqcSettlement: input.l2Settlement ?? null,
            },
          },
          last_updated: new Date().toISOString(),
          updated_by: input.creatorId,
        })
        .eq('id', twinRow.id);
    }

    await supabase.from('layer_boundaries').insert({
      source_layer: feedbackBoundary.sourceLayer,
      target_layer: feedbackBoundary.targetLayer,
      data_hash: feedbackBoundary.dataHash,
      gate_name: feedbackBoundary.gateName,
      rules_applied: feedbackBoundary.rulesApplied,
      all_passed: feedbackBoundary.allPassed,
    });

    let deployInstructions: Record<string, unknown> | null = null;

    if (input.userConfirmedDeploy) {
      try {
        deployInstructions = await this.requestContractDeployment({
          assetId: input.assetId,
          symbol: input.symbol,
          network: input.network ?? 'sepolia',
          userConfirmedDeploy: true,
        });
      } catch (err) {
        if (err instanceof SmartContractGuardError) {
          deployInstructions = {
            status: 'DEPLOY_BLOCKED',
            message: err.message,
            code: err.code,
          };
        } else {
          throw err;
        }
      }
    }

    return {
      layer: 'EXECUTION' as const,
      pqc: input.l2Settlement
        ? {
            algorithm: 'ML_DSA_87' as const,
            fips: 'FIPS-204',
            ...input.l2Settlement,
          }
        : null,
      token,
      onChain: {
        linked: onChainLinked,
        standard: 'ERC-3643',
        contractAddress: contractAddress ?? null,
        identityRegistry: registerHint?.trexIdentityRegistry ?? null,
        primaryOffering: registerHint?.escrowContractAddr ?? null,
        mockUsdc: registerHint?.mockUsdc ?? null,
        trexFactory: registerHint?.trexFactory ?? null,
        modularCompliance: registerHint?.modularCompliance ?? null,
        maxBalanceModule: registerHint?.maxBalanceModule ?? null,
      },
      feedbackGate: feedbackBoundary,
      deployInstructions,
      nextSteps: onChainLinked
        ? ['POST /api/offerings to open primary sale', 'Register investors on-chain identity registry before subscribe']
        : [
            'npm run deploy:testnet',
            'Re-run pipeline with userConfirmedDeploy: true to refresh on-chain linkage',
          ],
    };
  }
}
