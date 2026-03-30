const fs = require('fs');
const { getRuntimeConfig } = require('./protocol_runtime_config.cjs');

const RUNTIME = getRuntimeConfig();

function printSection(title) {
  console.log(`\n## ${title}`);
}

function main() {
  console.log('# Post-Deploy Sync Plan');
  console.log(`chainId: ${RUNTIME.chainId}`);

  printSection('Current Runtime');
  for (const [label, address] of Object.entries({
    MARKETPLACE_ATP: RUNTIME.addresses.marketplace,
    ORINA_RWA: RUNTIME.addresses.orinaRwa,
    RECEIPT_NFT: RUNTIME.addresses.receiptNft,
    PAYMENT_GATEWAY: RUNTIME.addresses.paymentGateway,
    FEE_MANAGER: RUNTIME.addresses.feeManager,
    DISPUTE_MANAGER: RUNTIME.addresses.disputeManager,
    AUTOTIME_MANAGER: RUNTIME.addresses.autotimeManager,
    UNIT_REGISTRY: RUNTIME.addresses.unitRegistry,
    SHIPPING_REGISTRY: RUNTIME.addresses.shippingRegistry,
    TIMELOCK: RUNTIME.addresses.timelock,
    DELEGATION_MANAGER: RUNTIME.m2m.delegationManager,
    AI_WALLET_FACTORY_V2: RUNTIME.m2m.aiWalletFactoryV2,
  })) {
    console.log(`- ${label}: ${address}`);
  }

  printSection('Artifacts');
  for (const artifactPath of [RUNTIME.artifacts.coreDeployRunJson, RUNTIME.artifacts.m2mDeployRunJson]) {
    console.log(`- ${artifactPath} ${fs.existsSync(artifactPath) ? '(present)' : '(missing)'}`);
  }

  printSection('Frontend Sync');
  console.log('- src/config/contracts.ts must match the addresses above.');
  console.log('- src/config/eip712.ts must keep MarketplaceATP version/domain aligned with the live contracts.');
  console.log('- Root .env must keep VITE_M2M_DELEGATION_MANAGER and VITE_M2M_AI_WALLET_FACTORY_V2 on the live M2M stack.');

  printSection('Backend Sync');
  console.log('- foundry/.env must contain only one authoritative address block for the live stack.');
  console.log('- supabase/audit/protocol_runtime_config.cjs is the shared source of truth for backfill, probe, and smoke scripts.');
  console.log('- Run: node supabase/audit/onchain_runtime_status_probe.cjs');
  console.log('- Run: node supabase/audit/backfill_protocol_projection.cjs --apply-linked');
  console.log('- Run: node supabase/audit/backfill_protocol_order_events.cjs --apply-linked');
  console.log('- Run: node supabase/audit/verify_protocol_projection_rest.cjs');
  console.log('- Run: npm run build');

  printSection('Operator Docs');
  console.log('- docs/spec/13-atp-protocol-runtime-spec.md');
  console.log('- docs/spec/14-production-env-flip-runbook.md');
  console.log('- foundry/CUTOVER_CHECKLIST.md');
}

main();
