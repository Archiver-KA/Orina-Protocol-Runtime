# Browser And Wallet Smoke

Audit date: 2026-05-13

Phase 4 used the authorized Chrome DevTools Protocol fixture on `http://127.0.0.1:9222`. No seed phrase, private key, wallet password, recovery phrase, encrypted vault file, signature, transaction, approval, mint, transfer, or wallet configuration was requested or accessed.

## Setup

- Local app route: `http://localhost:5173/`
- CDP endpoint: `http://127.0.0.1:9222`
- Browser observed: Chrome/147.0.7727.139
- Dev server:
  - Started local Vite with `npm run dev -- --host 127.0.0.1`
  - Initial `localhost` readiness wait timed out, but follow-up checks returned HTTP 200 for both `http://127.0.0.1:5173/` and `http://localhost:5173/`.

## Commands

- `Start-Process -FilePath npm.cmd -ArgumentList @('run','dev','--','--host','127.0.0.1') -PassThru -WindowStyle Hidden`
- `Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 2`
- `Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -UseBasicParsing -TimeoutSec 5`
- `Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 5`
- `npm run smoke:cdp:readonly-security`
- `Invoke-WebRequest -UseBasicParsing -Method Options -Headers @{ Origin = <origin>; 'Access-Control-Request-Method' = 'GET' } -Uri 'https://vcixsdudkizgfikhmfuv.supabase.co/functions/v1/make-server-b0d68fc8/health' -TimeoutSec 20`

## Read-Only Routes And Actions

| Route | Action | Observed Result |
| --- | --- | --- |
| `http://localhost:5173/` | CDP `Page.navigate` | App loaded. Marketplace and wallet UI markers present. No auth-session prompt marker. No DOM leak pattern names. |
| `http://localhost:5173/settings` | CDP `Page.navigate` | App loaded. Wallet/settings UI markers present. No DOM leak pattern names. |
| `http://localhost:5173/marketplace` | CDP `Page.navigate` | App loaded. Marketplace markers present. No DOM leak pattern names. |

## Wallet Observation

- `window.ethereum` present: true
- MetaMask detected: true
- Read-only `eth_accounts` request succeeded: true
- Account count: 1
- Selected address present: true
- Read-only `eth_chainId` request succeeded: true
- Wallet confirmation targets: none
- No signing, transaction, approval, minting, transfer, or wallet mutation was attempted.

## Auth And Session Observation

- `orina_wallet_auth_session` present: false
- Supabase bridge session present: false
- This matches the documented split between wallet connection and wallet-auth/bridge session establishment: a browser wallet can be connected while owner-scoped writes still require a separate wallet security/auth step.
- No protected UI secret patterns were observed in DOM text or storage value scans.

## Storage Inspected

The smoke script enumerated storage key names and scanned key names plus sampled values for forbidden secret patterns. Values were not printed in this audit artifact.

Sensitive/session keys specifically checked:

- `orina_wallet_auth_session`: absent
- Supabase bridge session key: absent in the script's observed storage state
- `wagmi.store`: present
- `wagmi.recentConnectorId`: present
- `wagmi.injected.connected`: present
- `mm-sdk-anon-id`: present
- `orina_force_guest_mode`: present
- `orina_marketplace_view_mode`: present
- `orina:protocol-network-key`: present
- `orina:marketplace-viewer-key`: present

Other localStorage key families inspected:

- `user_profile_*_chain_97`
- `orina_supabase_map_profile_*`
- `orina_supabase_map_asset_*`
- `orina_runtime_receipts_v1:*`
- `orina_runtime_minted_assets_v2:*`
- `orina_collection_favorites_*`
- `orina_delivery_addresses_*`
- `orina_user_settings_*`
- `orina_favorites_*`
- `orina_runtime_collections_v1`
- `orina_taxonomy_nodes_cache_v1`
- `orina:reputation-ratings-cache-v1`
- `orina:reputation-score-cache-v1`
- `studio_community_posts`
- `studio_user_actions`

sessionStorage keys inspected:

- `orina_notifications_<wallet>`

IndexedDB:

- Supported: true
- Databases observed: none
- Flagged stores: none

Cookies:

- Cookies observed for tested routes: none
- Cookie leak matches: none

Storage leak matches:

- localStorage key names: none
- localStorage values: none
- sessionStorage key names: none
- sessionStorage values: none
- IndexedDB stores: none

## Console

- Console error count: 5
- Expected auth-guard error count: 5
- Security console errors: none

The console errors matched the smoke script's documented auth-guard patterns and did not indicate a secret, private-key, CORS, forbidden, or service-role failure.

## Network Origins

Observed origins:

- `http://localhost:5173`
- `https://fonts.googleapis.com`
- `https://fonts.gstatic.com`
- `https://gateway.pinata.cloud`
- `https://s.alicdn.com`
- `https://vcixsdudkizgfikhmfuv.supabase.co`

Unexpected origins according to current smoke allowlist:

- `https://s.alicdn.com`

Classification:

- `OWNER_DECISION_REQUIRED`

Evidence:

- `npm run smoke:cdp:readonly-security` exited 1 only because `https://s.alicdn.com` was not in the approved-origin list.
- Repository code contains an Alibaba DataHub integration in `supabase/functions/server/b2b-api-client.ts` and maps API-returned product image URLs into `imageUrl`.
- Repository documentation and smoke allowlist do not explicitly approve `s.alicdn.com` as a browser image origin.

Residual risk:

- Marketplace/supplier images can trigger browser requests to supplier CDN hosts that are not explicitly governed by repository policy. Narrowing, proxying, blocking, or approving those hosts requires a documented owner decision because it can affect visible marketplace media behavior.

## CORS Check

The CDP route did not observe Edge Function responses, so a separate read-only preflight was run against the documented Supabase health endpoint without secrets.

Allowed origin:

- Request origin: `https://app.orina.io`
- Status: 204
- `Access-Control-Allow-Origin`: `https://app.orina.io`
- `Vary`: `Accept-Encoding, Origin, Access-Control-Request-Headers`

Disallowed origin:

- Request origin: `https://evil.example`
- Status: 204
- `Access-Control-Allow-Origin`: absent
- `Vary`: `Accept-Encoding, Origin, Access-Control-Request-Headers`

Classification:

- `IMPLEMENTED`

Evidence:

- Runtime preflight echoed the approved origin and did not return `*`.
- Runtime preflight did not emit `Access-Control-Allow-Origin` for the disallowed origin.
- Static scan also passed CORS checks in `npm run security:scan`.

Residual risk:

- Broad preview host patterns remain gated by `ORINA_CORS_ALLOW_PREVIEW_ORIGINS`; ownership of preview host exposure remains an operational decision.

## Overall Result

- Classification: PARTIAL
- App loads: verified
- Wallet connection state detected: verified
- Protected wallet UI secret exposure: no leak observed
- Auth/session flow: wallet connected but auth/bridge sessions absent, matching documented separation
- Marketplace read/browse flow: verified route load
- Console security errors: none
- Client secret leakage in storage/cookies/IndexedDB: none observed
- CORS behavior: verified by read-only preflight
- Unexpected network calls: `https://s.alicdn.com` requires owner policy decision
