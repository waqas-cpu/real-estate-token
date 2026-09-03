export interface TransferSimulationRequest {
  tokenId?: string;
  fromWallet: string;
  toWallet: string;
  tokenAmount: number;
  tokenPriceUsd?: number;
  fromJurisdiction?: string;
  toJurisdiction?: string;
  fromWhitelisted?: boolean;
  toWhitelisted?: boolean;
  fromBalance?: number;
  toBalance?: number;
  totalSupply?: number;
  fromLockupUntil?: string | null;
  originatorVasp?: string;
  beneficiaryVasp?: string;
}

export interface ComplianceCheckResult {
  rule: string;
  passed: boolean;
  reason?: string;
}

export interface TransferSimulationResult {
  canTransfer: boolean;
  blockReason?: string;
  checks: ComplianceCheckResult[];
  travelRuleRequired: boolean;
  travelRuleSatisfied: boolean;
  maxInvestorHoldingLimit: number;
  resultingRecipientOwnershipPct: number;
}

export class TransferComplianceEngine {
  // Sanctioned jurisdictions (ISO 2-letter codes)
  private restrictedJurisdictions = new Set(['KP', 'IR', 'SY', 'CU', 'RU-CR']);
  private travelRuleThresholdUsd = 3000;
  private maxBalancePct = 10; // 10% cap per investor

  /**
   * Simulate and pre-flight check a security token transfer across all compliance dimensions.
   */
  simulateTransfer(req: TransferSimulationRequest): TransferSimulationResult {
    const checks: ComplianceCheckResult[] = [];
    const totalSupply = req.totalSupply ?? 30000;
    const maxHoldingTokens = Math.floor((totalSupply * this.maxBalancePct) / 100);
    const tokenPrice = req.tokenPriceUsd ?? 100;
    const transferUsdValue = req.tokenAmount * tokenPrice;

    // 1. Whitelisting check
    const fromWl = req.fromWhitelisted ?? true;
    const toWl = req.toWhitelisted ?? true;
    checks.push({
      rule: 'SENDER_WHITELISTED',
      passed: fromWl,
      reason: fromWl ? undefined : 'Sender wallet is not KYC/KYB verified or whitelisted',
    });
    checks.push({
      rule: 'RECEIVER_WHITELISTED',
      passed: toWl,
      reason: toWl ? undefined : 'Receiver wallet is not KYC/KYB verified or whitelisted',
    });

    // 2. Sender balance sufficiency
    const fromBal = req.fromBalance ?? 1000;
    const hasEnoughBalance = fromBal >= req.tokenAmount;
    checks.push({
      rule: 'SUFFICIENT_BALANCE',
      passed: hasEnoughBalance,
      reason: hasEnoughBalance
        ? undefined
        : `Sender balance (${fromBal}) insufficient for transfer (${req.tokenAmount})`,
    });

    // 3. Reg D / Reg S Holding period lockup check
    let lockupPassed = true;
    let lockupReason: string | undefined;
    if (req.fromLockupUntil) {
      const lockupDate = new Date(req.fromLockupUntil);
      if (lockupDate.getTime() > Date.now()) {
        lockupPassed = false;
        lockupReason = `Tokens locked under Reg S/D holding period until ${lockupDate.toISOString()}`;
      }
    }
    checks.push({
      rule: 'HOLDING_PERIOD_LOCKUP',
      passed: lockupPassed,
      reason: lockupReason,
    });

    // 4. Country / Sanctions restriction check
    const fromJur = (req.fromJurisdiction ?? 'US').toUpperCase();
    const toJur = (req.toJurisdiction ?? 'US').toUpperCase();
    const isFromRestricted = this.restrictedJurisdictions.has(fromJur);
    const isToRestricted = this.restrictedJurisdictions.has(toJur);
    const countryPassed = !isFromRestricted && !isToRestricted;
    checks.push({
      rule: 'JURISDICTION_SANCTIONS_CHECK',
      passed: countryPassed,
      reason: countryPassed
        ? undefined
        : `Transfer involves restricted jurisdiction (From: ${fromJur}, To: ${toJur})`,
    });

    // 5. Max investor holding limit check (10% ceiling)
    const toBal = req.toBalance ?? 0;
    const resultingBalance = toBal + req.tokenAmount;
    const resultingPct = (resultingBalance / totalSupply) * 100;
    const maxBalancePassed = resultingBalance <= maxHoldingTokens;
    checks.push({
      rule: 'MAX_INVESTOR_BALANCE_CEILING',
      passed: maxBalancePassed,
      reason: maxBalancePassed
        ? undefined
        : `Transfer would exceed 10% maximum balance ceiling (${resultingBalance} > ${maxHoldingTokens} tokens)`,
    });

    // 6. FATF Travel Rule check
    const travelRuleRequired = transferUsdValue >= this.travelRuleThresholdUsd;
    const travelRuleSatisfied =
      !travelRuleRequired || Boolean(req.originatorVasp && req.beneficiaryVasp);
    checks.push({
      rule: 'FATF_TRAVEL_RULE_COMPLIANCE',
      passed: travelRuleSatisfied,
      reason: travelRuleSatisfied
        ? undefined
        : `Cross-border transfer value ($${transferUsdValue.toFixed(2)}) requires originator & beneficiary VASP identity data`,
    });

    const failed = checks.find((c) => !c.passed);

    return {
      canTransfer: !failed,
      blockReason: failed?.reason,
      checks,
      travelRuleRequired,
      travelRuleSatisfied,
      maxInvestorHoldingLimit: maxHoldingTokens,
      resultingRecipientOwnershipPct: Math.round(resultingPct * 1000) / 1000,
    };
  }
}
