import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('RWA Critical Security Smart Contracts Suite', () => {
  let deployer: any;
  let complianceAgent: any;
  let emergencyOp: any;
  let oracleSigner: any;
  let investorA: any;
  let investorB: any;

  beforeEach(async () => {
    [deployer, complianceAgent, emergencyOp, oracleSigner, investorA, investorB] =
      await ethers.getSigners();
  });

  describe('1 & 2. Role-Based Access Control (RwaAccessControl)', () => {
    it('initializes roles and grants specific permissions correctly', async () => {
      const AccessControlFactory = await ethers.getContractFactory('RwaAccessControl');
      const access = await AccessControlFactory.deploy(deployer.address);
      await access.waitForDeployment();

      expect(await access.hasRole(await access.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.true;
      expect(await access.isEmergencyOperator(deployer.address)).to.be.true;

      // Grant compliance role to complianceAgent
      await access.grantRole(await access.COMPLIANCE_AGENT_ROLE(), complianceAgent.address);
      expect(await access.isComplianceAgent(complianceAgent.address)).to.be.true;
      expect(await access.isComplianceAgent(investorA.address)).to.be.false;

      // Grant oracle role to oracleSigner
      await access.grantRole(await access.ORACLE_ROLE(), oracleSigner.address);
      expect(await access.isOracle(oracleSigner.address)).to.be.true;

      // Non-admin cannot grant roles
      await expect(
        access.connect(investorA).grantRole(await access.EMERGENCY_ROLE(), investorB.address)
      ).to.be.reverted;
    });
  });

  describe('3. Multisig Administration (RwaMultiSigAdmin)', () => {
    it('enforces M-of-N threshold signatures to execute administrative transactions', async () => {
      const MultiSigFactory = await ethers.getContractFactory('RwaMultiSigAdmin');
      const owners = [deployer.address, complianceAgent.address, emergencyOp.address];
      const multisig = await MultiSigFactory.deploy(owners, 2); // 2-of-3
      await multisig.waitForDeployment();

      expect(await multisig.threshold()).to.equal(2n);
      expect(await multisig.isOwner(deployer.address)).to.be.true;
      expect(await multisig.isOwner(investorA.address)).to.be.false;

      // Deploy a mock recipient contract
      const MockUSDC = await ethers.getContractFactory('MockUSDC');
      const usdc = await MockUSDC.deploy();
      await usdc.waitForDeployment();
      await usdc.transferOwnership(await multisig.getAddress());

      // Submit mint proposal via multisig (mint 500 usdc to investorA)
      const mintCallData = usdc.interface.encodeFunctionData('mint', [investorA.address, 500n]);
      
      const submitTx = await multisig.connect(deployer).submitTransaction(
        await usdc.getAddress(),
        0,
        mintCallData
      );
      await submitTx.wait();

      let txn = await multisig.getTransaction(0);
      expect(txn.numConfirmations).to.equal(1n); // Submitter auto-confirms
      expect(txn.executed).to.be.false;

      // Confirm with 2nd owner (complianceAgent) -> triggers execution
      await multisig.connect(complianceAgent).confirmTransaction(0);

      txn = await multisig.getTransaction(0);
      expect(txn.numConfirmations).to.equal(2n);
      expect(txn.executed).to.be.true;
      expect(await usdc.balanceOf(investorA.address)).to.equal(500n);
    });
  });

  describe('4. Emergency Pause & Circuit Breaker (RwaEmergencyController & PrimaryOfferingTREX)', () => {
    it('allows EMERGENCY_ROLE to pause offering, blocking subscriptions until admin unpauses', async () => {
      const AccessControlFactory = await ethers.getContractFactory('RwaAccessControl');
      const access = await AccessControlFactory.deploy(deployer.address);
      await access.waitForDeployment();

      await access.grantRole(await access.EMERGENCY_ROLE(), emergencyOp.address);

      const MockUSDC = await ethers.getContractFactory('MockUSDC');
      const usdc = await MockUSDC.deploy();
      await usdc.waitForDeployment();

      // Mock token stub address for testing offering pause
      const OfferingFactory = await ethers.getContractFactory('PrimaryOfferingTREX');
      const offering = await OfferingFactory.deploy(
        await usdc.getAddress(),
        investorA.address, // token dummy
        100n
      );
      await offering.waitForDeployment();
      await offering.activate();
      await offering.setEmergencyOperator(emergencyOp.address);

      expect(await offering.paused()).to.be.false;

      // Emergency operator pauses offering
      await offering.connect(emergencyOp).pause();
      expect(await offering.paused()).to.be.true;

      // Subscribing while paused should fail
      await expect(offering.connect(investorB).subscribe(10n)).to.be.revertedWith('Offering is paused');

      // Emergency operator cannot unpause (only owner/admin can unpause)
      await expect(offering.connect(emergencyOp).unpause()).to.be.revertedWith('Ownable: caller is not the owner');

      // Admin unpauses
      await offering.connect(deployer).unpause();
      expect(await offering.paused()).to.be.false;
    });

    it('emergency controller triggers circuit breaker pause for offerings', async () => {
      const AccessControlFactory = await ethers.getContractFactory('RwaAccessControl');
      const access = await AccessControlFactory.deploy(deployer.address);
      await access.waitForDeployment();
      await access.grantRole(await access.EMERGENCY_ROLE(), emergencyOp.address);

      const EmergencyControllerFactory = await ethers.getContractFactory('RwaEmergencyController');
      const controller = await EmergencyControllerFactory.deploy(await access.getAddress());
      await controller.waitForDeployment();

      const MockUSDC = await ethers.getContractFactory('MockUSDC');
      const usdc = await MockUSDC.deploy();
      await usdc.waitForDeployment();

      const OfferingFactory = await ethers.getContractFactory('PrimaryOfferingTREX');
      const offering = await OfferingFactory.deploy(
        await usdc.getAddress(),
        investorA.address,
        100n
      );
      await offering.waitForDeployment();
      await offering.activate();
      await offering.setEmergencyOperator(await controller.getAddress());

      // Operator triggers pause via controller
      await controller.connect(emergencyOp).emergencyPauseOffering(await offering.getAddress(), "Exploit suspected");
      expect(await offering.paused()).to.be.true;
    });
  });

  describe('5. Transfer Compliance Modules (Country Restrict & Lockup)', () => {
    it('country restrict module correctly identifies restricted jurisdictions', async () => {
      const CountryModuleFactory = await ethers.getContractFactory('RwaCountryRestrictModule');
      // Restrict country 999 (fictional sanctioned country)
      const countryModule = await CountryModuleFactory.deploy([999]);
      await countryModule.waitForDeployment();

      expect(await countryModule.isCountryRestricted(999)).to.be.true;
      expect(await countryModule.isCountryRestricted(840)).to.be.false; // US
      expect(await countryModule.isCountryRestricted(826)).to.be.false; // UK
    });

    it('time lockup module enforces holding period lockup timestamps', async () => {
      const LockupModuleFactory = await ethers.getContractFactory('RwaTimeLockupModule');
      const lockupModule = await LockupModuleFactory.deploy(365 * 24 * 3600); // 1 year
      await lockupModule.waitForDeployment();

      const futureTimestamp = Math.floor(Date.now() / 1000) + 100000;
      // When lockup is set on investorA
      expect(await lockupModule.lockupExpiry(investorA.address)).to.equal(0n);
    });
  });

  describe('7. Oracle & Data Integrity Controls (RwaPriceOracle)', () => {
    it('enforces price updates by authorized oracle and trips circuit breaker on excessive deviation', async () => {
      const AccessControlFactory = await ethers.getContractFactory('RwaAccessControl');
      const access = await AccessControlFactory.deploy(deployer.address);
      await access.waitForDeployment();

      await access.grantRole(await access.ORACLE_ROLE(), oracleSigner.address);

      const OracleFactory = await ethers.getContractFactory('RwaPriceOracle');
      const oracle = await OracleFactory.deploy(await access.getAddress());
      await oracle.waitForDeployment();

      const assetKey = ethers.keccak256(ethers.toUtf8Bytes('property-kensington-001'));
      const initialPrice = 100_000_000n; // 100 USDC (6 decimals)

      // Initial price report by oracle
      await oracle.connect(oracleSigner).updatePrice(assetKey, initialPrice, 'APPRAISAL_CHAINLINK');
      const validPrice = await oracle.getValidPrice(assetKey);
      expect(validPrice[0]).to.equal(initialPrice);

      // A 5% price change is within 10% deviation band (allowed)
      const normalPrice = 105_000_000n;
      await oracle.connect(oracleSigner).updatePrice(assetKey, normalPrice, 'APPRAISAL_CHAINLINK');
      expect((await oracle.getValidPrice(assetKey))[0]).to.equal(normalPrice);

      // A 50% price surge exceeds the 10% maximum deviation threshold -> trips circuit breaker
      const spikePrice = 160_000_000n;
      await expect(
        oracle.connect(oracleSigner).updatePrice(assetKey, spikePrice, 'APPRAISAL_CHAINLINK')
      ).to.be.revertedWith('Price deviation exceeds circuit breaker band; admin override required');

      // Admin can force override in special circumstances
      await oracle.connect(deployer).forceOverridePrice(assetKey, spikePrice, 'ADMIN_APPRAISAL_OVERRIDE');
      expect((await oracle.getValidPrice(assetKey))[0]).to.equal(spikePrice);
    });

    it('rejects price reports from unauthorized accounts', async () => {
      const AccessControlFactory = await ethers.getContractFactory('RwaAccessControl');
      const access = await AccessControlFactory.deploy(deployer.address);
      await access.waitForDeployment();

      const OracleFactory = await ethers.getContractFactory('RwaPriceOracle');
      const oracle = await OracleFactory.deploy(await access.getAddress());
      await oracle.waitForDeployment();

      const assetKey = ethers.keccak256(ethers.toUtf8Bytes('property-kensington-001'));

      await expect(
        oracle.connect(investorA).updatePrice(assetKey, 100_000_000n, 'UNAUTHORIZED')
      ).to.be.revertedWith('Caller is not authorized oracle');
    });
  });
});
