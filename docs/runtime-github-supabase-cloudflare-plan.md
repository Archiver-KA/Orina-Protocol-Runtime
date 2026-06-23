# Runtime GitHub, Supabase, Cloudflare Plan

## Current baseline

- Canonical repo: `C:\ORINA\ATPProtocol2\Orina Protocol - Runtime`
- Branch: `main`
- Remote: `origin -> https://github.com/Archiver-KA/Orina-Protocol-Runtime`
- Protocol runtime: ATP v3.5 beta on BSC Testnet, namespace `orina-atp-v3.5-fee-split-nft-orifee-bsc-testnet-20260604`
- Live frontend hostname: `https://app.orina.io`
- Live Cloudflare Worker service: `apporinaio`
- Existing root-site assets remain outside this plan:
  - `https://orina.io`
  - `https://www.orina.io`
- Deploy mode target:
  - source of truth stays on GitHub
  - Cloudflare Worker Builds pulls from GitHub on every push to `main`
  - Cloudflare deploys Worker `apporinaio` from the repo build output
  - custom domain `app.orina.io` stays bound to that Worker service

## Commit plan

### Commit 1: live minting sidebar telemetry

Scope:

- wire minting page telemetry into runtime sidebar
- replace hardcoded sidebar metrics with live RPC + Binance stream data
- add Binance WebSocket adapter

Suggested message:

- `feat: add live minting sidebar telemetry and market pulse`

### Commit 2: Supabase environment alignment

Scope:

- confirm canonical frontend env names
- verify `VITE_SUPABASE_URL`
- verify `VITE_SUPABASE_ANON_KEY`
- verify runtime bridge/function names used by the frontend
- update `.env.example` only if runtime repo drifts from actual server contract

Suggested message:

- `chore: align frontend runtime env with supabase server`

### Commit 3: Cloudflare Worker deploy preparation

Scope:

- add `wrangler.jsonc` for Worker `apporinaio`
- remove repo-level deploy workflow so only the Cloudflare build path remains
- document the minimal Cloudflare-side env required for the deploy path
- keep `app.orina.io` isolated from the root-site Pages project

Suggested message:

- `chore: prepare cloudflare worker deployment`

## Supabase canonical contract

The runtime repo becomes the canonical frontend client for Supabase.

Rules:

- frontend only uses public browser env:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- never expose service-role or privileged admin secrets in frontend build env
- runtime verification gate before pushing production:
  - `npm run verify:viewer-release`
  - `npm run verify:protocol-runtime-surface`
- if `verify:protocol-runtime-surface` skips locally, production deploy must still provide env and pass against the target server

## Testnet payment-token alignment

Current probe on BSC Testnet:

- Starter Kit faucet is deployed at `0x6527262782C140e0A4724bef06431786556AfDE0`.
- `claimUSDT()` and `claimUSDC()` simulate successfully.
- Starter Kit tokens:
  - `USDT.t`: `0x8800279B4a5528628ef069698169C58B89377809`, 6 decimals, fee quote 150 bps.
  - `USDC.t`: `0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5`, 6 decimals, fee quote 150 bps.
- Protocol UI payment tokens now resolve marketplace `USDT`/`USDC` to the Starter Kit
  addresses through `VITE_TESTNET_USDT_T_ADDRESS` and `VITE_TESTNET_USDC_T_ADDRESS`.
- Seed seller AI auto-confirm sessions now use the Phase 2 split: 50 `USDT.t` and 50 `USDC.t`.

Conclusion:

- The Starter Kit can claim `USDT.t` and `USDC.t`.
- Claimed `USDT.t` balances fund the marketplace buy flow and passed the complete protocol smoke.
- Claimed `USDC.t` balances fund the Cohort B buy flow and passed the complete protocol smoke.

Recommended beta sync plan:

1. Make `USDT.t` the canonical beta payment token for the first public testnet order flow.
2. Keep `USDC.t` claimable in the Starter Kit for wallet/faucet QA, but do not route seed
   auto-confirm orders through it until a dual-token seller policy is introduced.
3. Keep the Starter Kit env pointing to the same canonical token addresses.
4. Regenerate seed asset catalog currency metadata only if the visible listing symbol changes.
   Current seed listings already show `USDT`, which maps to `USDT.t` during beta.
5. Recreate the 100 seed seller-confirm sessions with the `USDT.t` policy:
   - `allowedToken = 0x8800279B4a5528628ef069698169C58B89377809`
   - `actionMask = SELLER_CONFIRM`
   - finite expiry, currently 7 days
   - `counterpartyAllowlistHash = zeroHash`
6. Re-run protocol smoke:
   - claim token from faucet
   - approve Payment Gateway
   - create order
   - server executor calls `sellerConfirmFor`
   - buyer confirms delivery
   - projection sync verifies finalized state
7. Keep WBNB smoke as infrastructure fallback only, not the public beta payment UX.

Executed beta alignment on 2026-06-11:

- Frontend `PAYMENT_TOKENS.USDT` now resolves to `VITE_TESTNET_USDT_T_ADDRESS`
  when configured, with the old BSC testnet USDT address as fallback.
- Frontend `PAYMENT_TOKENS.USDC` now resolves to `VITE_TESTNET_USDC_T_ADDRESS`
  when configured, with the old BSC testnet USDC address as fallback.
- 100 seed seller-confirm sessions were recreated with `USDT.t`; on-chain verification
  returned `100/100` active sessions.
- Smoke order `94` passed with `USDT.t`:
  - claim: `0xcaa63ab18382147af8e775fae7ac08462793a8c6f1eaabb5b024acdf5a7b1837`
  - createOrder: `0xf659b10d91e36f926ac3549900a3e9785455b474831d8a1c5b69980e5332df46`
  - sellerConfirmFor: `0xc030432ee64c7f869c6bd1dbe145bd6f0c1eb59eef189af9fb14cbd4288d5faf`
  - confirmDelivery: `0x21968313c03926fab1dce5d4722db5b11bf59c59435f91e86ea21d8d16cb10bd`
  - final state: `state=3`, `finalized=true`, `sellerConfirmed=true`

### Phase 2: dual-token seed policy

Objective:

- make both Starter Kit payment tokens usable through the complete testnet order state machine
- preserve the contract invariant of one active session and one non-zero `allowedToken` per root
- prevent a listing from advertising a token that its seller AI session cannot confirm

Deterministic cohort policy:

| Cohort | Seed profiles | Listing currency | Session `allowedToken` |
| --- | --- | --- | --- |
| A | P001-P050 | `USDT` | `USDT.t` (`0x8800279B4a5528628ef069698169C58B89377809`) |
| B | P051-P100 | `USDC` | `USDC.t` (`0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5`) |

Session policy remains identical across both cohorts except for `allowedToken`:

- expiry: 7 days
- action mask: `SELLER_CONFIRM` only
- counterparty allowlist hash: `zeroHash`
- minimum gross price: 1 base unit
- maximum delivery: 10 days
- root revoke remains available

Preflight gate:

1. Verify token code, symbol, decimals, faucet claim amount, and FeeManager quote for both tokens.
2. Count seed profiles and listings by profile range; require exactly 50 sellers per cohort.
3. Preview every catalog mutation for P051-P100 before changing `currency`, `price`, and
   `estimated_price.currency` from `USDT` to `USDC`.
4. Verify all 100 current sessions are active and record session nonce, wallet, token, and expiry.
5. Require enough root/delegate tBNB for 50 revoke-and-redeploy operations plus two smoke flows.

Execution:

1. Keep P001-P050 catalog records and sessions unchanged on `USDT.t`.
2. Update P051-P100 listing currency metadata atomically to `USDC`; do not change numeric prices.
3. Revoke and recreate only P051-P100 sessions with `allowedToken = USDC.t`.
4. Refresh Supabase/search projections after the catalog transaction commits.
5. Reject or quarantine any listing whose currency does not match its seller cohort.
6. Record a new cohort ledger instead of overwriting the all-USDT.t ledger.

Required smoke matrix:

1. Cohort A: claim `USDT.t` -> approve -> create order -> AI `sellerConfirmFor` -> confirm delivery.
2. Cohort B: claim `USDC.t` -> approve -> create order -> AI `sellerConfirmFor` -> confirm delivery.
3. Negative boundary: a Cohort A seller must reject `USDC.t` auto-confirm with token mismatch.
4. Negative boundary: a Cohort B seller must reject `USDT.t` auto-confirm with token mismatch.
5. Projection checks must preserve payment token address, symbol, decimals, tx hashes, and final state.

Acceptance criteria:

- on-chain session distribution is exactly 50 `USDT.t` and 50 `USDC.t`
- catalog distribution is exactly aligned with the same seller cohorts
- both positive smoke orders finish with `state=3`, `finalized=true`, `sellerConfirmed=true`
- both cross-token negative tests fail before a delegated transaction is broadcast
- executor reports zero token-mismatch skips for orders created from canonical catalog listings
- typecheck, client-secret scan, build, and protocol projection verification pass

Rollback:

1. Stop the seller-confirm executor before changing catalog/session policy.
2. Restore P051-P100 catalog currency metadata to `USDT` from the preflight snapshot.
3. Revoke P051-P100 `USDC.t` sessions and recreate them with `USDT.t`.
4. Refresh search/projections and run one USDT.t smoke before re-enabling the executor.
5. Preserve both ledgers and rollback transaction hashes for audit.

Operational renewal:

- start renewal no later than 24 hours before the earliest cohort expiry
- renew one cohort at a time and keep the other cohort available during the rotation
- do not silently extend an expired session in the executor; require a new root-authorized session

Executed Phase 2 on 2026-06-22:

- Preflight found the previous 100 USDT.t sessions had expired on 2026-06-18, so both cohorts
  were renewed rather than changing only Cohort B.
- Catalog snapshot before mutation:
  `payment-policy/v3_5_beta_dual_token/catalog-cohort-b-preflight-20260622T075352Z.json`
- Catalog transaction updated exactly 150 P051-P100 assets from `USDT` to `USDC` and refreshed
  `marketplace_asset_browse_index_v1`.
- Rollback SQL: `supabase/audit/v3_5_beta_dual_token_phase2_catalog_rollback.sql`.
- Cohort A ledger:
  `ai-wallet-setup/v3_5_beta_dual_token_usdt_t_p001_p050_seller_confirm_7d_public/ledger.json`.
- Cohort B ledger:
  `ai-wallet-setup/v3_5_beta_dual_token_usdc_t_p051_p100_seller_confirm_7d_public/ledger.json`.
- On-chain postflight: 50 active USDT.t sessions and 50 active USDC.t sessions; earliest expiry
  is 2026-06-29T07:55:33Z.
- Cohort A smoke order `95` finalized with USDT.t:
  - createOrder: `0x34093ed28dc2a3d6f975dbc1737d1bef8895e87f150ab07f6d39af96e82ef1c5`
  - sellerConfirmFor: `0xfe404787e52a5f02ba6768738c152d217d82380aaaf9f16a8edca8340da495aa`
  - confirmDelivery: `0x38d69105452c2147fc82b48288056da0308fb1290c5b01411d2e03c0d4cc45e8`
- Cohort B smoke order `96` finalized with USDC.t:
  - claim: `0x799fee2ee2c4c762ee893cf91a700a380650b6ff4d16b5772d6344a6f6817027`
  - createOrder: `0xaeb6fedd9021fb19b0c0f1585377588b2725881ed82b05f5e08d8c79fa10241f`
  - sellerConfirmFor: `0x6072e2975d31d28f4245fe31c95c11dea9102ac8f93d1711563ad936067d9969`
  - confirmDelivery: `0xe278358329ef66a24b635b1f26ade144f732755ab099a8d794bada0095148770`
- Cross-token simulations reverted with `InvalidPaymentToken` selector `0x56e7ec5f` in both
  directions without broadcasting a transaction.
- Supabase projection contains both finalized orders with the correct payment token symbol,
  address, state, and seven protocol events per order.
- Verification passed: script syntax checks, TypeScript typecheck, 50/50 Vitest tests,
  client-secret scan, and production build.
- The dependency gate was closed on 2026-06-22: Vite, Vitest, Viem/Wagmi, Babel, tar, and ws
  were moved to patched releases and `npm audit` reports zero findings at every severity.

Mainnet removal checklist:

1. Set `VITE_ENABLE_TESTNET_STARTER_KIT=false` in the mainnet build environment.
2. Remove Cloudflare build variables:
   - `VITE_TESTNET_TOKEN_FAUCET_ADDRESS`
   - `VITE_TESTNET_USDT_T_ADDRESS`
   - `VITE_TESTNET_USDC_T_ADDRESS`
   - `VITE_TESTNET_TBNB_FAUCET_URL`
3. Replace beta payment-token overrides with mainnet allowlisted token addresses in
   `PAYMENT_TOKENS`.
4. Recreate seller AI sessions with mainnet policy:
   - no mock token allowlist
   - finite expiry unless production governance approves a different invariant
   - counterparty binding required for buyer/pay authority
5. Remove or disable seed-only faucet smoke scripts from release gates.
6. Remove the P001-P050/P051-P100 cohort routing and derive payment policy from mainnet seller
   configuration instead of seed profile IDs.
7. Run release gate and one mainnet-safe dry-run/probe before enabling live order payments.

## Cloudflare Worker baseline

The live app is not running on Pages. It is bound through a Workers custom-domain record:

- `app.orina.io -> apporinaio`

The repo now targets a GitHub-driven Worker deploy:

- source repo: `Archiver-KA/Orina-Protocol-Runtime`
- production branch: `main`
- build command: `npm run build`
- static assets source: `dist`
- runtime config source: `wrangler.jsonc`
- SPA routing mode: `assets.not_found_handling = "single-page-application"`

Only `app.orina.io` is in scope. Do not edit:

- `orina.io`
- `www.orina.io`
- Pages project `orina-io`

### Single deploy path

- Keep:
  - Cloudflare Worker Builds on `apporinaio`
  - `wrangler.jsonc` in the repo
  - `protocol-release-gate.yml` as verification only
- Remove:
  - repo-level deploy workflow `.github/workflows/deploy-apporinaio.yml`
  - ad-hoc local `wrangler deploy` except for emergency recovery

### Cloudflare-side env required

Cloudflare Worker Builds for `apporinaio` reads its own dashboard build variables. GitHub repository
secrets do not feed this build path.

Required in `Settings > Build > Build variables and secrets`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`

Recommended for exact parity with the current live runtime:

- `VITE_SITE_URL=https://app.orina.io`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_AUTH_BRIDGE_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_PATH_PREFIX=/auth/supabase-claim-bridge`
- `VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2`
- `VITE_SUPABASE_AI_M2M_PATH_PREFIX=`
- `VITE_SUPABASE_SELLER_MINTING_FN_NAME=orina-seller-minting-v1`
- `VITE_SUPABASE_RECEIPT_SYNC_FN_NAME=orina-receipt-sync-v1`
- `VITE_M2M_DELEGATION_MANAGER=0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441`
- `VITE_WALLET_AUTH_SESSION_TTL_MS=604800000`

Do not put frontend-incompatible secrets into the Cloudflare Worker build:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ATP2_SUPABASE_JWT_SECRET`
- `ATP2_M2M_DELEGATE_ENCRYPTION_KEY`
- any `ATP2_*` private server secret intended for Supabase Edge Functions

### Runtime defaults now pinned in source

- canonical Supabase project: `ystjugghyteyylkevbsl` (`Orina ATP v3.5 beta`)
- `VITE_SITE_URL=https://app.orina.io`
- `VITE_SUPABASE_AI_M2M_FN_NAME=orina-ai-m2m-v2`
- `VITE_SUPABASE_SHARED_SERVER_FN_NAME=make-server-b0d68fc8`
- `VITE_SUPABASE_AUTH_BRIDGE_ENABLED=true`
- `VITE_ENABLE_SUPABASE_CONFIG_FALLBACK=true`
- `VITE_M2M_DELEGATION_MANAGER=0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13`
- `VITE_M2M_AI_WALLET_FACTORY_V2=0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441`

Operational notes:

- the deploy path is GitHub-driven through Cloudflare, not through GitHub Actions
- push to `main` should remain the only production trigger
- local `wrangler deploy` should be treated as emergency-only and followed by a normal Git push sync
- public Supabase config is resolved as one atomic tuple: URL, project ref, and public key
- when fallback is enabled, missing, stale, or cross-project build variables resolve to the canonical
  v3.5 public fallback; when fallback is disabled, inconsistent config fails closed

### Marketplace incident check (2026-06-22)

- Symptom: `/marketplace` loaded the shell but showed an empty or stale supplier catalog.
- Root cause: the live bundle used the legacy `vcixsdudkizgfikhmfuv` public fallback while the
  v3.5 seed catalog lives in `ystjugghyteyylkevbsl`.
- Fix: replace the legacy fallback and reject mixed URL/project/JWT configuration.
- Regression coverage: `utils/supabase/publicConfig.test.ts` covers coherent env config, stale
  project fallback, and fail-closed behavior.
- Production-bundle smoke result: 13 initial media/card elements rendered, seed products were
  visible, only `ystjugghyteyylkevbsl.supabase.co` was contacted, and browser errors were empty.
- Deployment gate: inspect the built `dist` and require zero files containing
  `vcixsdudkizgfikhmfuv` before publishing `apporinaio`.

### Marketplace Map View incident check (2026-06-23)

- Symptom: switching Marketplace from grid/list to Map View crashed the React surface and left
  the page white before MapLibre could create a canvas.
- Root cause: seed metadata used the legacy coordinate shape
  `{ latitude, longitude }` and omitted `geoPath`; the UI cast remote JSON directly to
  `AssetLocationSnapshot` and then read `geoPath.length` without runtime validation.
- Fix: normalize remote location metadata at the catalog boundary, accept both
  `{ lat, lng }` and `{ latitude, longitude }`, synthesize a locality path from legacy `city`,
  reject out-of-range coordinates, and build map markers through a defensive pure mapper.
- Regression coverage: `src/utils/marketplaceLocation.test.ts` verifies missing `geoPath`, legacy
  coordinate keys, city fallback, and invalid-coordinate rejection.
- Browser smoke: desktop rendered `48` assets and `24` pins on a `1194x444` canvas; mobile rendered
  the same pins on a `366x702` canvas with no horizontal overflow or browser errors.

## Release gate

Before commit/push:

1. `npm run verify:viewer-release`
2. `npm run security:scan`
3. `npm run verify:repo-tooling`
4. `npm run typecheck`
5. `npm run verify:marketplace-freshness`
6. `npm run verify:assurance-invariants`
7. `npm run verify:deterministic-build`
8. `npm run security:sbom`
9. `npm run release:manifest`
10. confirm remote `origin/main` is the intended publish target
11. review only runtime-relevant diff

Before Cloudflare production deploy:

1. confirm Cloudflare build env is present
2. confirm Supabase target project and public anon key
3. smoke wallet connect + minting sidebar + protected runtime routes on preview
