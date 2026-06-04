import { ethers } from 'hardhat';
import type { TrexInfrastructure } from './deployTrexInfrastructure.js';

/** Deploy shared RWA helpers (twin anchor, ZK stub) once per network. */
export async function ensureRwaSharedContracts(
  infra: TrexInfrastructure
): Promise<TrexInfrastructure> {
  if (!infra.twinAnchor) {
    const f = await ethers.getContractFactory('RwaTwinAnchor');
    const c = await f.deploy();
    await c.waitForDeployment();
    infra.twinAnchor = await c.getAddress();
    console.log('RwaTwinAnchor:', infra.twinAnchor);
  }
  if (!infra.zkVerifierStub) {
    const f = await ethers.getContractFactory('RwaZkVerifierStub');
    const c = await f.deploy();
    await c.waitForDeployment();
    infra.zkVerifierStub = await c.getAddress();
    console.log('RwaZkVerifierStub:', infra.zkVerifierStub);
  }
  return infra;
}
