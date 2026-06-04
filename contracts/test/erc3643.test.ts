import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployTrexInfrastructure } from '../scripts/lib/deployTrexInfrastructure';
import { registerInvestor } from '../scripts/lib/registerInvestor';
import { attachTrex } from '../scripts/lib/trexArtifacts';

describe('ERC-3643 (T-REX) RWA suite', () => {
  it('deploys token with 10% max balance and primary offering', async () => {
    const [deployer, investor] = await ethers.getSigners();
    const infra = await deployTrexInfrastructure();

    const MaxBalanceModule = await ethers.getContractFactory('RwaMaxBalanceModule');
    const maxBalanceModule = await MaxBalanceModule.deploy(30_000);
    await maxBalanceModule.waitForDeployment();

    const trexFactory = await attachTrex('TREXFactory', infra.trexFactory, deployer);
    const salt = 'test-rwa-1';
    const deployerAddr = await deployer.getAddress();

    await trexFactory.deployTREXSuite(
      salt,
      {
        owner: deployerAddr,
        name: 'RWA Test',
        symbol: 'RWAT',
        decimals: 0,
        irs: ethers.ZeroAddress,
        ONCHAINID: ethers.ZeroAddress,
        irAgents: [deployerAddr],
        tokenAgents: [deployerAddr],
        complianceModules: [await maxBalanceModule.getAddress()],
        complianceSettings: [],
      },
      { claimTopics: [], issuers: [], issuerClaims: [] }
    );

    const tokenAddr = await trexFactory.getToken(salt);
    const token = await attachTrex('Token', tokenAddr, deployer);
    const irAddr = await token.identityRegistry();

    const usdc = await (await ethers.getContractFactory('MockUSDC')).deploy();
    await usdc.waitForDeployment();

    const price = 100n * 1_000_000n;
    const offering = await (
      await ethers.getContractFactory('PrimaryOfferingTREX')
    ).deploy(await usdc.getAddress(), tokenAddr, price);
    await offering.waitForDeployment();
    const offeringAddr = await offering.getAddress();

    await registerInvestor(infra.identityImplementationAuthority, irAddr, deployerAddr, 840, deployer);
    await registerInvestor(
      infra.identityImplementationAuthority,
      irAddr,
      offeringAddr,
      840,
      deployer
    );
    await registerInvestor(
      infra.identityImplementationAuthority,
      irAddr,
      await investor.getAddress(),
      840,
      deployer
    );

    await token.addAgent(offeringAddr);
    await offering.activate();
    await token.mint(offeringAddr, 30_000n);

    const compliance = await attachTrex('ModularCompliance', await token.compliance(), deployer);
    const setMaxIface = new ethers.Interface(['function setMaxBalance(uint256 maxBalance_)']);
    await compliance.callModuleFunction(
      setMaxIface.encodeFunctionData('setMaxBalance', [3000n]),
      await maxBalanceModule.getAddress()
    );

    await token.unpause();

    await usdc.mint(await investor.getAddress(), 1_000_000n * 1_000_000n);
    await usdc.connect(investor).approve(offeringAddr, ethers.MaxUint256);

    await offering.connect(investor).subscribe(100n);
    expect(await token.balanceOf(await investor.getAddress())).to.equal(100n);

    await expect(offering.connect(investor).subscribe(3000n)).to.be.reverted;
  });
});
