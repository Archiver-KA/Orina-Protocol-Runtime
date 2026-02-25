# ATP Production Deployment Master Plan

Version: 3.3-final  
Date: 2026-02-13  
Mode: Zero-Trust / Adversarial

## 1. Scope
- In-scope:
- Smart contracts deployment and wiring validation
- Frontend/backend environment hardening
- Supabase security and data consistency checks
- Event/index consistency and production gates
- Out-of-scope:
- Protocol logic redesign
- Contract upgrade/migration architecture changes

## 2. Deployment Stages
1. Stage A - Preflight and freeze
- Freeze branch and tag release candidate.
- Verify contract ABI/address/chainId matrix is final.
- Confirm `.env.production` values for frontend and backend.
- Confirm RPC and block explorer API credentials for verify.

2. Stage B - Smart contract deployment and verification
- Deploy contracts in production order.
- Verify bytecode + constructor args on explorer.
- Execute post-deploy role grants and runtime wiring.
- Run smoke flow: create/pay/release/dispute/cancel sample orders.

3. Stage C - Backend and database hardening
- Deploy Supabase functions with signature verification enabled.
- Validate RLS policies and service-role isolation.
- Validate nonce/timestamp anti-replay in wallet auth.
- Run cross-user access denial tests.

4. Stage D - Frontend release
- Build production bundle from tagged commit.
- Inject production contract addresses and chain config.
- Validate wallet flow, pending tx states, refresh resilience.
- Validate profile/favorites/following persistence per address+chainId.

5. Stage E - Go/No-Go gate
- Execute full checklist in `02_PRODUCTION_CHECKLIST.md`.
- Collect evidence and approvals.
- Go live only when all critical gates pass.

## 3. Critical Invariants
- Financial truth source is on-chain only.
- Frontend cannot authoritatively set escrow/order outcomes.
- Identity always derived from cryptographic wallet proof.
- Database isolation prevents cross-user access.
- localStorage is cache-only and scoped by address+chainId.

## 4. Mandatory Runtime Checks
- `MarketplaceATP.autoTimeManager()` equals deployed AutoTime.
- `AutoTimeManager.marketplace()` equals deployed Marketplace.
- `DisputeManager.marketplace()` equals deployed Marketplace.
- `PaymentGateway.hasRole(MARKETPLACE_ROLE, marketplace)` is true.
- `PaymentGateway.hasRole(MARKETPLACE_ROLE, disputeManager)` is true.
- `DisputeManager.hasRole(AUTOTIME_ROLE, autoTimeManager)` is true.

## 5. Required Deliverables
- Deployed contract address map with tx hashes.
- ABI compatibility report (frontend config vs deployed bytecode).
- Supabase security report (RLS, policy tests, replay tests).
- End-to-end escrow lifecycle evidence with two wallets.
- Signed Go/No-Go approval record.
