import { describe, it, expect, beforeEach } from 'vitest';
import {
  mlDsa87Keygen,
  mlDsa87Sign,
  mlDsa87Verify,
  mlKem1024Keygen,
  mlKem1024Encapsulate,
  mlKem1024Decapsulate,
  slhDsaKeygen,
  slhDsaSign,
  slhDsaVerify,
  verifyUtf8Message,
} from '../../src/lib/crypto/pqc/nist.js';
import { splitSecret, combineShares } from '../../src/lib/crypto/pqc/shamir.js';
import { hybridKemKeygen, hybridKemEncapsulate, hybridKemDecapsulate } from '../../src/lib/crypto/pqc/hybridChannel.js';
import {
  signL2SettlementIntent,
  verifyL2SettlementIntent,
  settlementIntentHash,
} from '../../src/lib/crypto/pqc/l2Settlement.js';
import { SecurityLayerOrchestrator } from '../../src/lib/layers/SecurityLayer.js';
import { OracleCoordinator } from '../../src/lib/layers/DataLayer.js';
import { resetPqcKeyStore, getOracleSigningKeyPair } from '../../src/lib/crypto/pqc/keyStore.js';
import { utf8ToBytes } from '../../src/lib/crypto/pqc/encoding.js';

describe('NIST PQC (@noble/post-quantum)', () => {
  beforeEach(() => {
    resetPqcKeyStore();
  });

  it('ML-DSA-87 signs and verifies', () => {
    const keys = mlDsa87Keygen();
    const msg = utf8ToBytes('rwa-settlement-test');
    const sig = mlDsa87Sign(msg, keys.secretKey);
    expect(mlDsa87Verify(sig.raw, msg, keys.publicKey)).toBe(true);
    expect(verifyUtf8Message('rwa-settlement-test', sig.encoded, keys.publicKeyEnc)).toBe(true);
  });

  it('ML-KEM-1024 encapsulates and decapsulates', () => {
    const keys = mlKem1024Keygen();
    const { cipherText, sharedSecret } = mlKem1024Encapsulate(keys.publicKeyEnc);
    const alice = mlKem1024Decapsulate(cipherText, keys.secretKey);
    expect(Buffer.from(alice).equals(Buffer.from(sharedSecret))).toBe(true);
  });

  it('SLH-DSA-SHA2-256f signs and verifies', () => {
    const keys = slhDsaKeygen();
    const msg = utf8ToBytes('archive-integrity');
    const sig = slhDsaSign(msg, keys.secretKey);
    expect(slhDsaVerify(sig.raw, msg, keys.publicKey)).toBe(true);
  });

  it('Shamir t-of-n reconstructs ceremony seed', () => {
    const secret = utf8ToBytes('ceremony-seed-32-bytes!!!!!!!!!');
    const shares = splitSecret(secret, 3, 5);
    const recovered = combineShares([shares[0]!, shares[2]!, shares[4]!]);
    expect(Buffer.from(recovered).equals(Buffer.from(secret))).toBe(true);
  });

  it('hybrid X25519+ML-KEM-768 derives matching secrets for recipient', () => {
    const alice = hybridKemKeygen();
    const mallory = hybridKemKeygen();
    const { cipherTextEnc, sharedSecretHex: encapsulatorHex } =
      hybridKemEncapsulate(alice.publicKeyEnc);
    const aliceHex = hybridKemDecapsulate(cipherTextEnc, alice.secretKey);
    expect(aliceHex).toBe(encapsulatorHex);
    const malloryHex = hybridKemDecapsulate(cipherTextEnc, mallory.secretKey);
    expect(malloryHex).not.toBe(aliceHex);
  });

  it('L2 settlement intent is ML-DSA signed', () => {
    const keys = mlDsa87Keygen();
    const intent = {
      version: 1 as const,
      network: 'base-sepolia' as const,
      chainId: 84532,
      assetId: 'asset-1',
      symbol: 'RWA1',
      investorWallet: '0xabc',
      action: 'REGISTER_TOKEN' as const,
      contractAddress: null,
      nonce: 'n1',
      issuedAt: new Date().toISOString(),
    };
    const { signatureML_DSA, intentHash } = signL2SettlementIntent(intent, keys);
    expect(intentHash).toBe(settlementIntentHash(intent));
    expect(
      verifyL2SettlementIntent(intent, signatureML_DSA, keys.publicKeyEnc)
    ).toBe(true);
  });

  it('SecurityLayer ceremony produces verifiable audit signatures', async () => {
    const security = new SecurityLayerOrchestrator();
    await security.processSecuritySetup();
    const audit = await security.auditManager.recordAuditEvent(
      'PQC_TEST',
      'tester',
      'SECURITY',
      {},
      security.keyManager
    );
    expect(audit.signature.startsWith('pqc1:ml_dsa_87:sig:')).toBe(true);
    const ok = await security.auditManager.verifyAuditEventSignatures(
      [audit],
      security.keyManager
    );
    expect(ok).toBe(true);
  });

  it('oracle attestations use ML-DSA-87', async () => {
    const oracle = new OracleCoordinator();
    const attestations = await oracle.collectAttestations('asset-x', 'VALUATION', 2);
    const pk = getOracleSigningKeyPair().publicKeyEnc;
    for (const att of attestations) {
      expect(att.signatureML_DSA.startsWith('pqc1:ml_dsa_87:sig:')).toBe(true);
    }
    expect(await oracle.verifyAttestationSignatures(attestations)).toBe(true);
    expect(
      verifyUtf8Message(
        `${attestations[0]!.assetId}|${attestations[0]!.dataType}|${attestations[0]!.value}|${attestations[0]!.source}`,
        attestations[0]!.signatureML_DSA,
        pk
      )
    ).toBe(true);
  });
});
