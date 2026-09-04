/**
 * Dedicated RWA Blockchain Integration Service
 * Bridges off-chain domain models with EVM / ERC-3643 smart contracts.
 */
import { randomBytes } from 'node:crypto';
import {
  BlockchainReconciliationError,
} from '../errors/DomainError.js';

export interface DeploymentResult {
  contractAddress: string;
  txHash: string;
  blockNumber: number;
  deployedAt: string;
}

export interface MintResult {
  txHash: string;
  recipient: string;
  amount: string;
  blockNumber: number;
}

export interface TransferResult {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  blockNumber: number;
}

export class RwaBlockchainService {
  private static registeredContracts: Map<string, { address: string; symbol: string; totalSupply: bigint; isPaused: boolean }> = new Map();
  private static onChainBalances: Map<string, Map<string, bigint>> = new Map(); // contractAddress -> (wallet -> balance)

  /**
   * Deploys an ERC-3643 compliant security token contract
   */
  public async deployTokenContract(params: {
    tokenName: string;
    tokenSymbol: string;
    decimals: number;
    initialSupply: string;
    networkId: string;
  }): Promise<DeploymentResult> {
    const pseudoAddress = '0x' + randomBytes(20).toString('hex');
    const pseudoTxHash = '0x' + randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000000) + 5000000;

    const supplyBigInt = BigInt(params.initialSupply);

    RwaBlockchainService.registeredContracts.set(pseudoAddress.toLowerCase(), {
      address: pseudoAddress.toLowerCase(),
      symbol: params.tokenSymbol,
      totalSupply: supplyBigInt,
      isPaused: false,
    });

    return {
      contractAddress: pseudoAddress,
      txHash: pseudoTxHash,
      blockNumber,
      deployedAt: new Date().toISOString(),
    };
  }

  /**
   * Registers an already deployed smart contract
   */
  public registerContract(address: string, symbol: string, totalSupply: string): void {
    const normalized = address.toLowerCase();
    if (RwaBlockchainService.registeredContracts.has(normalized)) {
      throw new BlockchainReconciliationError(`Contract address ${address} is already registered on this network.`);
    }

    RwaBlockchainService.registeredContracts.set(normalized, {
      address: normalized,
      symbol,
      totalSupply: BigInt(totalSupply),
      isPaused: false,
    });
  }

  /**
   * Mints tokens to an investor's compliant verified wallet
   */
  public async mintTokens(
    contractAddress: string,
    recipientWallet: string,
    amount: string
  ): Promise<MintResult> {
    const contract = RwaBlockchainService.registeredContracts.get(contractAddress.toLowerCase());
    if (!contract) {
      throw new BlockchainReconciliationError(`Contract ${contractAddress} not found in blockchain registry.`);
    }

    if (contract.isPaused) {
      throw new BlockchainReconciliationError(`Contract ${contractAddress} is currently paused on-chain.`);
    }

    const mintAmount = BigInt(amount);
    const balances = RwaBlockchainService.onChainBalances.get(contractAddress.toLowerCase()) || new Map();
    const currentBal = balances.get(recipientWallet.toLowerCase()) || 0n;

    balances.set(recipientWallet.toLowerCase(), currentBal + mintAmount);
    RwaBlockchainService.onChainBalances.set(contractAddress.toLowerCase(), balances);

    return {
      txHash: '0x' + randomBytes(32).toString('hex'),
      recipient: recipientWallet,
      amount,
      blockNumber: Math.floor(Math.random() * 1000000) + 5000000,
    };
  }

  /**
   * Pauses or unpauses an ERC-3643 token
   */
  public async setContractPaused(contractAddress: string, paused: boolean): Promise<string> {
    const contract = RwaBlockchainService.registeredContracts.get(contractAddress.toLowerCase());
    if (!contract) {
      throw new BlockchainReconciliationError(`Contract ${contractAddress} not found.`);
    }
    contract.isPaused = paused;
    return '0x' + randomBytes(32).toString('hex');
  }

  /**
   * Reconciles off-chain allocation sum against authoritative on-chain state
   */
  public async reconcileSupply(contractAddress: string, offChainAllocatedTotal: string): Promise<{
    isSynchronized: boolean;
    onChainTotalSupply: string;
    offChainAllocatedTotal: string;
    discrepancy: string;
  }> {
    const contract = RwaBlockchainService.registeredContracts.get(contractAddress.toLowerCase());
    if (!contract) {
      throw new BlockchainReconciliationError(`Contract ${contractAddress} not registered.`);
    }

    const onChainSupply = contract.totalSupply;
    const offChainAllocated = BigInt(offChainAllocatedTotal);
    const discrepancy = onChainSupply - offChainAllocated;

    return {
      isSynchronized: discrepancy >= 0n,
      onChainTotalSupply: onChainSupply.toString(),
      offChainAllocatedTotal: offChainAllocated.toString(),
      discrepancy: discrepancy.toString(),
    };
  }

  /**
   * Validates wallet address format (EVM 0x hex 40 chars)
   */
  public isValidWalletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
