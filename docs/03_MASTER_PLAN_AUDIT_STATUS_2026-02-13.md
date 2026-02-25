# Production Deployment Master Plan - Audit Status

Date: 2026-02-13  
Protocol target: 3.3-final  
Audit mode: Zero-trust checklist execution on current repo state

## 0. Overall Verdict
- Status: `NOT PRODUCTION READY`
- Reason:
- Multiple critical controls are incomplete (`FAIL`/`PARTIAL`) in auth hardening, DB security evidence, contract/live integration coverage, and operational controls.

## 1. Evidence Snapshot
- Frontend build: `PASS`
- Command: `npm run build`
- Result: build success (Vite output generated)
- Key references:
- `src/config/contracts.ts`
- `src/utils/messagesClient.ts`
- `supabase/functions/server/index.tsx`
- `supabase/functions/server/wallet-auth.ts`
- `supabase/functions/server/messages-handler.ts`

## 2. Section-by-Section Checklist Status

### Section 1 - Domain Authority Model
- Financial truth source defined: `PARTIAL`
- Social truth source defined: `PARTIAL`
- localStorage cache-only rule: `FAIL`
- No dual source of truth: `FAIL`
- Notes:
- UI still carries mock/demo financial and order state in several components.
- localStorage is used heavily beyond strict preference cache.
- Evidence:
- `src/app/components/orders.tsx` (mock orders + TODO blockchain calls)
- `src/utils/conversationUtils.ts`
- `src/utils/profileUtils.ts`

### Section 2 - Smart Contract Integration
- Production addresses hard-verified: `BLOCKED` (no deployed address manifest in repo)
- ABI version vs bytecode: `BLOCKED` (requires on-chain verification)
- ChainId lock enforced end-to-end: `PARTIAL`
- Critical write flows tested in production mode: `FAIL`
- Critical read flows tested by state matrix: `FAIL`
- Event coverage in UI hooks: `PARTIAL`
- No UI override of contract truth: `FAIL`
- Notes:
- Contract config is env-driven and typed, but many screens still use mock data/TODO.
- Evidence:
- `src/config/contracts.ts`
- `src/hooks/useContractEvents.ts`
- `src/app/components/orders.tsx`
- `src/hooks/useUserOrders.ts`

### Section 3 - Wallet Authentication & Identity
- Signature challenge implemented: `PASS`
- Backend verifies signature: `PASS`
- Session token flow implemented for messages: `PASS`
- Backend rejects wallet mismatch: `PASS`
- Replay mitigation (timestamp window): `PASS`
- Nonce invalidation one-time semantics: `PARTIAL` (timestamp-window based, no nonce store)
- Evidence:
- `supabase/functions/server/wallet-auth.ts`
- `supabase/functions/server/index.tsx`
- `supabase/functions/server/messages-handler.ts`
- `src/utils/messagesClient.ts`

### Section 4 - Database Architecture (Supabase)
- Explicit schema / PK / FK / indexes: `BLOCKED` (no SQL migrations present in repo)
- RLS enabled and tested: `BLOCKED`
- Public table exposure check: `BLOCKED`
- Service role key leakage in frontend: `PASS` (service role only in edge functions)
- Notes:
- Current backend uses KV helper and service role in function runtime.
- No schema migration folder or policy scripts available for audit proof.
- Evidence:
- `supabase/functions/server/kv_store.tsx`
- `supabase/functions/server/api-auth.tsx`

### Section 5 - Event Indexer
- Listener and block tracking: `FAIL` (no dedicated indexer subsystem)
- Idempotency, reorg handling, restart-safety: `FAIL`
- Notes:
- UI event hooks exist for live wallet reads, but no persistent ingestion pipeline.

### Section 6 - Escrow Flow Validation
- Two-wallet full lifecycle scripted evidence: `BLOCKED`
- Refresh/disconnect/reload safety matrix run: `PARTIAL`
- No double execution/client race: `PARTIAL`
- Notes:
- Message auth race issue has been addressed with session token.
- Escrow lifecycle test evidence is not in this repo.

### Section 7 - Social Layer
- Profile ownership enforcement: `PARTIAL`
- Sender spoof protection in messaging: `PASS`
- Rate limit and payload limits: `FAIL`
- Community anti-spam uniqueness constraints: `FAIL/UNVERIFIED`
- Reputation non-client-authoritative: `FAIL`
- Evidence:
- `supabase/functions/server/messages-handler.ts` (good sender checks)
- No rate limiter in `supabase/functions/server/index.tsx`
- Multiple local-only reputation/community stores in `src/utils/*`

### Section 8 - Search & Marketplace Index
- Search non-authoritative rule: `PARTIAL`
- Detail page authoritative re-fetch: `PARTIAL`
- Price reconciliation with on-chain state: `FAIL/PARTIAL`
- Large dataset and stable sort tests: `UNVERIFIED`
- Evidence:
- search/market views include mock datasets and derived UI filtering.

### Section 9 - Local Storage Controls
- Address scoping: `PASS` (many keys include address)
- Address + chainId scoping: `FAIL`
- Tampering safety for financial state: `FAIL/PARTIAL`
- Migration idempotence: `PARTIAL`
- Corrupted JSON handling: `PARTIAL`
- Evidence:
- `src/utils/profileUtils.ts`, `src/utils/favoritesUtils.ts`, `src/utils/conversationUtils.ts`
- Key naming generally address-based but not chainId-based.

### Section 10 - Security Hardening
- Secrets in frontend bundle: `PARTIAL`
- `.env` excluded from repo: `FAIL` (`.gitignore` only has `node_modules`)
- CSP configured: `FAIL`
- XSS and unsafe HTML checks: `PASS/PARTIAL` (no `dangerouslySetInnerHTML` found)
- API validation and forged payload denial: `PARTIAL`
- Rate limiting: `FAIL`
- Evidence:
- `.gitignore`
- `vite.config.ts`
- `supabase/functions/server/index.tsx`

### Section 11 - Observability & Operations
- Structured logging: `PARTIAL` (console logging only)
- Error monitoring and alerting: `FAIL`
- Health checks: `PASS` (`/make-server-b0d68fc8/health`)
- Rollback/backups documented: `FAIL/UNVERIFIED`
- Evidence:
- `supabase/functions/server/index.tsx`

### Section 12 - Performance & Stability
- Build + runtime baseline: `PASS` for build
- High RPC latency handling: `PARTIAL`
- DB/load tests: `UNVERIFIED`
- Memory leak/infinite loop checks: `PARTIAL`
- Notes:
- Message auth popup storm fixed via session-token mechanism.

### Section 13 - Final Production Gate
- Two-wallet full lifecycle no-manual-intervention: `BLOCKED`
- No data leak across users: `UNVERIFIED/PARTIAL`
- No production console red errors: `UNVERIFIED`
- No financial mismatch UI vs contract: `FAIL/PARTIAL`
- Gate result: `FAIL`

## 3. Critical Gaps to Close (Priority Order)
1. Remove/replace all mock financial lifecycle paths in production screens.
2. Add deploy manifest + on-chain ABI/address verification evidence.
3. Implement DB schema migrations + RLS policy scripts + policy tests.
4. Add rate limiting and abuse controls on edge functions.
5. Scope all localStorage authority-sensitive keys by `address + chainId`.
6. Harden repository hygiene (`.env*`, deploy secrets) in `.gitignore`.
7. Add observability stack (structured logs, errors, alerts, uptime checks).
8. Run and archive two-wallet end-to-end escrow evidence.

## 4. Immediate Fix Checklist (Execution-Ready)
- [ ] Update `.gitignore` to include `.env`, `.env.*`, build artifacts.
- [ ] Add `docs/production/04_ADDRESS_MANIFEST.md` after deploy.
- [ ] Add `supabase/migrations/*` with schema and RLS policies.
- [ ] Add edge-function rate limiter middleware.
- [ ] Replace `src/app/components/orders.tsx` mock flow with contract hooks.
- [ ] Add chainId to localStorage key derivation utilities.
- [ ] Add smoke test script for create/pay/release/dispute/cancel.
- [ ] Add Go/No-Go signoff file with explicit approvers.
