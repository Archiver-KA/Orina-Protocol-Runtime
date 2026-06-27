# Mainnet Production Checklist

Status: pre-mainnet checklist
Last updated: 2026-06-27

## Security Gates

- Clean Foundry build and full suite pass.
- Deep invariants, Echidna, Medusa, Slither, Mythril, and 4naly3er outputs are current and triaged.
- Certora or comparable formal coverage expands beyond `FeeManager` to core settlement and delegation contracts.
- Human review/private audit covers business logic, governance, dispute policy, oracle assumptions, delegated sessions, and operational abuse paths.
- All accepted residual risks are signed off by owner/governance.

## Runtime And Env Gates

- Frontend contract constants, backend runtime config, indexer config, docs, and broadcast artifacts agree.
- No testnet faucet token or `VITE_TESTNET_*` starter-kit value is present in production builds.
- EIP-712 domain uses the production chain id and production `MarketplaceATP`.
- Supabase projections remain service/indexer-write only where required.
- Production CORS, rate limits, wallet claim bridge, and Edge Function secrets are configured from secret managers only.

## Governance And Economic Gates

- Production governance safe, timelock, arbiter, emergency, and vault addresses are final.
- Deployer EOA roles are removed or documented with expiry.
- M2M `DelegationManager.DEFAULT_ADMIN_ROLE` is handed to timelock/governance.
- Production token allowlist and ORI quote/oracle policy are approved.
- Fee caps, DAO/platform split, referral policy, and treasury accounting are confirmed.

## Production Smoke

- Controlled mint/list/order flow succeeds.
- Payment, delivery, fee distribution, refund, dispute, and receipt paths succeed.
- Auto-time dry path is verified without unintended settlement.
- M2M flow succeeds after governance handoff.
- Event indexing and Supabase projection ingest expected events.
- Monitoring covers RPC health, failed transactions, stuck orders, open disputes, escrow totals, and role changes.

## No-Go

- Any untriaged High/Medium security finding.
- Human review missing.
- Production env contains testnet faucet assets.
- Deployer EOA retains unexpected admin/governance authority.
- ORI separate fee mode is live without quote/oracle policy.
- Runtime config, docs, backend config, and broadcast artifacts disagree.
