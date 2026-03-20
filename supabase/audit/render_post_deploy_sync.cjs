const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DEFAULT_RUN_JSON = path.join(
  ROOT,
  'foundry',
  'broadcast',
  'DeployFullSystem.s.sol',
  '97',
  'run-latest.json',
);

const TARGET_CONTRACTS = [
  'MarketplaceATP',
  'OrinaRWA',
  'RWAReceiptNFT',
  'PaymentGateway',
  'FeeManager',
  'AutoTimeManager',
  'DisputeManager',
  'UnitRegistry',
  'ShippingRegistry',
  'TimelockController',
];

function readRunJson(runJsonPath) {
  return JSON.parse(fs.readFileSync(runJsonPath, 'utf8'));
}

function collectAddresses(parsed) {
  const transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const result = {};

  for (const tx of transactions) {
    if (tx && tx.contractName && tx.contractAddress) {
      result[tx.contractName] = tx.contractAddress;
    }

    const nested = Array.isArray(tx?.additionalContracts) ? tx.additionalContracts : [];
    for (const contract of nested) {
      if (contract && contract.contractName && contract.address) {
        result[contract.contractName] = contract.address;
      }
    }
  }

  return result;
}

function printSection(title) {
  console.log(`\n## ${title}`);
}

function main() {
  const runJsonPath = process.argv[2]
    ? path.resolve(ROOT, process.argv[2])
    : DEFAULT_RUN_JSON;

  if (!fs.existsSync(runJsonPath)) {
    console.error(`RUN_JSON_NOT_FOUND ${runJsonPath}`);
    process.exit(1);
  }

  const parsed = readRunJson(runJsonPath);
  const addresses = collectAddresses(parsed);

  console.log('# Post-Deploy Sync Plan');
  console.log(`run-latest.json: ${runJsonPath}`);

  printSection('Captured Addresses');
  for (const name of TARGET_CONTRACTS) {
    const address = addresses[name] || '(missing)';
    console.log(`- ${name}: ${address}`);
  }

  printSection('Frontend Address Sync');
  console.log('- Update src/config/contracts.ts with the new addresses above.');
  console.log('- Keep ACTIVE_CHAIN_ID on 97 unless you intentionally switch environments.');
  console.log('- Update src/config/eip712.ts only if MarketplaceATP.VERSION changed.');

  printSection('Runtime Sync');
  console.log('- Run: node supabase/audit/onchain_runtime_status_probe.cjs');
  console.log('- Run: npm run build');
  console.log('- Re-run any smoke importer or order-state probe against the new marketplace address.');

  printSection('Protocol Gate');
  console.log('- Current contract stack supports RWA order flow and finalization-minted NFTs.');
  console.log('- It does not by itself implement OpenSea-style NFT direct buy without order lifecycle.');
  console.log('- Do not treat this redeploy as direct-buy NFT support unless separate listing/exchange contracts are added.');
}

main();
