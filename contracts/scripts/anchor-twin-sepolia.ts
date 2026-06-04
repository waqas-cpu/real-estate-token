/**
 * Anchor digital twin IPFS CID on RwaTwinAnchor (Sepolia).
 * Usage: npm run anchor:twin --prefix contracts -- --assetId <uuid> --cid Qm...
 */
import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

function parseArg(name: string): string {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error(`Missing ${name}`);
  }
  return process.argv[idx + 1]!;
}

function assetIdToKey(assetId: string): string {
  return '0x' + createHash('sha256').update(assetId).digest('hex');
}

async function main() {
  const assetId = parseArg('--assetId');
  const cid = parseArg('--cid');
  const infraFile = path.join(__dirname, '..', 'deployments', `${network.name}-infrastructure.json`);
  if (!fs.existsSync(infraFile)) {
    throw new Error('Run npm run deploy:sepolia first');
  }
  const infra = JSON.parse(fs.readFileSync(infraFile, 'utf8')) as { twinAnchor?: string };
  if (!infra.twinAnchor) throw new Error('twinAnchor missing from infrastructure file');

  const [signer] = await ethers.getSigners();
  const anchor = await ethers.getContractAt('RwaTwinAnchor', infra.twinAnchor);
  const key = assetIdToKey(assetId);
  const tx = await anchor.anchorTwin(key, cid);
  console.log('tx:', tx.hash);
  await tx.wait();
  console.log('Anchored', assetId, '→', cid);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
