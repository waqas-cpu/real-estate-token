import * as fs from 'fs';

import * as path from 'path';

import { fileURLToPath } from 'url';

import { config } from '../config.js';



export interface TestnetDeployment {

  standard?: string;

  trexVersion?: string;

  network: string;

  chainId: number;

  salt?: string;

  infrastructure?: {

    trexFactory: string;

    trexImplementationAuthority: string;

    identityFactory: string;

    identityImplementationAuthority: string;

    twinAnchor?: string;

    zkVerifierStub?: string;

  };

  contracts: {

    mockUsdc: string;

    rwaToken: string;

    primaryOffering: string;

    trexFactory?: string;

    identityRegistry?: string;

    modularCompliance?: string;

    maxBalanceModule?: string;

    twinAnchor?: string;

    zkVerifierStub?: string;

  };

  economics: Record<string, string | number>;

  mainnet?: { blocked: boolean; note?: string };

  warning?: string;

}



export function getTestnetZkVerifierAddress(): string | null {
  const d = loadTestnetDeployment();
  return d?.contracts?.zkVerifierStub ?? d?.infrastructure?.zkVerifierStub ?? null;
}

export function loadTestnetDeployment(): TestnetDeployment | null {

  const file =

    config.chainDeploymentFile ||

    path.join(

      path.dirname(fileURLToPath(import.meta.url)),

      '../../../contracts/deployments/sepolia.json'

    );



  try {

    if (!fs.existsSync(file)) return null;

    return JSON.parse(fs.readFileSync(file, 'utf8')) as TestnetDeployment;

  } catch {

    return null;

  }

}

