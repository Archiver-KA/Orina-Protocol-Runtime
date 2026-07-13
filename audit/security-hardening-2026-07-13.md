# Runtime Security Hardening Report — 2026-07-13

## Scope and conclusion

This pass reviewed the tracked runtime repository: browser code, Supabase Edge Functions, SQL migrations, audit/smoke tooling, build configuration, CI workflows, dependency manifests, and Git history. No Solidity source is present in this repository, so contract bytecode/source assurance remains outside this pass.

All repository-local P0/P1 findings identified in this pass were remediated and the local gates listed below pass. This is not a claim that the deployed system has zero vulnerabilities: live Supabase grants/RLS, deployed Edge configuration, wallet flows, external secret state, and GitHub/Cloudflare controls require owner-authorized verification.

## Remediated findings

### P0 — repository controls closed

- Wallet authentication now uses a server-issued one-time challenge, exact wallet/chain/origin/message binding, atomic consume, replay/expiry rejection, distributed wallet/IP throttling, bounded JWTs, and active session/profile validation.
- Browser wallet proofs and bridge tokens moved from durable `localStorage` to short-lived tab-scoped `sessionStorage`; legacy entries are purged.
- Supabase REST mutations and protected RPCs fail closed without an H1 bridge token. Anon credentials remain limited to explicitly public reads/RPCs.
- Privileged repair/global mutation routes require an operator wallet allowlist. Wallet-facing receipt sync can no longer trigger global block-range scans.
- Migration `000082` protects profile/collection trust fields, removes authenticated writes to protocol projections, preserves `uint256` values with `numeric(78,0)`, and replaces review submission with order-scoped verification/quarantine controls.
- AI/M2M state is relational. Migration `000083` serializes invite creation, one-time claim, delegate capacity, and encrypted managed-key persistence in Postgres transactions. Private keys/ciphertext are neither returned nor logged.
- Migration `000084` backfills wallet-scoped legacy AI conversations, removes the cached plaintext CJ token, and revokes runtime Data API access to the legacy KV archive. The dead KV runtime module was removed.
- Remote image/product URLs now require public HTTPS destinations and reject credentials, local/IP targets, unsafe ports, redirects, oversized responses, invalid MIME/magic bytes, and unapproved AI image hosts.
- Edge request bodies and external vendor responses are stream-bounded. Rate-limit store failures, unknown budgets, malformed audit output, and missing protected credentials fail closed.
- API key generation enforces entropy/quota limits, stores only hashes, returns the raw key once, and prevents secret-bearing responses from entering idempotency replay storage.

### P1 — defense in depth closed

- CSP, HSTS, nosniff, frame, referrer, permissions, opener, and resource policies ship through `public/_headers`; broad `connect-src https:`/`wss:` schemes were removed.
- GitHub Actions are commit-SHA pinned, checkout credentials are not persisted, dependency review blocks high-severity changes, Deno dependencies are locked/audited, and production/connected-wallet workflows retain explicit approval gates.
- Supplier/profile text is normalized before prompt composition and supplier data is explicitly treated as untrusted instructions.
- Request logs no longer record paths/query strings or wallet/profile payloads; vendor error bodies and detailed public health configuration are suppressed.
- The Data API grant verifier now evaluates migrations in order and applies later `REVOKE` statements, preventing a false-green report for the legacy KV table.

## Verification evidence

- `npm audit`: 0 critical, high, moderate, low, or info vulnerabilities.
- `deno audit --level=high`: no known vulnerabilities.
- `npm run typecheck` and `npm run typecheck:edge`: pass for the browser app and all eight Edge entrypoints.
- `npm run lint:check`: pass with zero warnings.
- `npm test`: 27 test files / 111 tests pass; the suite includes URL/SSRF, response bounds, wallet-session, scanner-policy, supplier-data, effective-grant, and current Supabase CLI migration-output coverage.
- `npm run security:scan`: pass, including P0 static invariants, CORS, auth, M2M, messaging, IPFS, rate limiting, dependency, and Data API decisions.
- Supabase migration executor applied and aligned all 85 migrations; the production rerun is clean through `000085`.
- `npm run verify:assurance-invariants`, `verify:repo-tooling`, `verify:protocol-runtime-surface`, `verify:testnet-networks`, `audit:supabase:data-api-grants`, `verify:marketplace-freshness`: pass.
- `npm run build`: pass; 238 public routes prerendered and `_headers` copied to `dist`.
- `npm run verify:deterministic-build`: pass; 355 files in both builds with zero differences.
- `git diff --check`: pass.

## Secret scan evidence

Gitleaks v8.30.1 was checksum-verified before use.

- Git history: 102 heuristic detections. Ninety-one are generic patterns; four are documentation curl-auth examples; four are historical public Supabase anon JWTs; three are a RapidAPI access-token pattern in commit `c863244ff85d16991907fc83defcc9c179fd1b52` (`orina_agent/tool_kit_API.md`). Treat the RapidAPI credential as compromised until the owner confirms rotation.
- Current tracked source: no confirmed embedded secret after triage; generic detections are environment names, public contract addresses, and generated chain-projection fixtures.
- Ignored local files were not opened or printed, but the scan found secret-like material, including GitHub fine-grained PAT patterns in `.env` and `supabaseJWT.md`. These files are ignored by Git. The owner must rotate/verify those credentials and securely remove stale local copies.

## Owner-authorized production preparation

- Deployed runtime candidate: `f556cf3d25951ae8dc007d4e39e4d1ae7f210cbb`.
- GitHub owner access, strict `Viewer Release Gate` branch protection, workflow availability, required repository secret names, and the `production` environment were verified without exposing secret values.
- Port `9222` showed the logged-in public-mirror GitHub page and canonical Supabase project `ystjugghyteyylkevbsl`; the inspector did not read cookies, browser storage, or tokens.
- Supabase CLI is authenticated and linked to `ystjugghyteyylkevbsl`. Migrations `000082`-`000085` are applied and remote history is aligned through `000085`.
- The local production-target preflight passed secret presence/shape and cross-project identity checks, then stopped only because the approval artifacts were intentionally still uncommitted.
- The post-migration live `SECURITY DEFINER` audit covers 27 functions and passes with findings `[]`; migration `000085` closed the one excess `service_role` execute grant found on the first live rerun.
- `supabase db lint` reported only PostGIS/extension function diagnostics; no repository-owned application function was identified in that output.

The private frontend push and Supabase Edge workflow are owner-approved with immediate production smoke and
rollback stop conditions. Alignment and live database audit conditions are satisfied.

## Production outcome

- GitHub Protocol Release Gate `29222411980`: success.
- Supabase Production Deploy `29222417728`: success for all seven split functions.
- Migrations: aligned through `000085`; live `SECURITY DEFINER` audit passed with 27 functions and findings `[]`.
- Backend health/CORS: every split function health route returned `200` with exact production allow-origin; denied preflight returned no allow-origin.
- Wallet claim negative smoke: all origin, missing-origin, invalid signature, malformed/stale message, and anon projection-write denials passed.
- Cloudflare frontend: production routes load, strict headers are delivered, no legacy Supabase ref exists in live assets, and the fail-closed config marker is present.
- Public mirror: `227364bee0d3051e0a2c585f565d071f1690de3c` passed public boundary, lint, web/contracts typechecks, 86 tests, and build before push.
- GitHub environments `production` and `wallet-smoke` are restricted to protected branches. Required reviewers/wait timers are blocked by the current private-repository billing plan.

## Residual owner actions

### P0 external custody and connected-smoke residuals

1. Rotate or conclusively revoke the historical RapidAPI token and both local GitHub PAT-like credentials. Decide whether coordinated Git history rewriting is required; it was not performed because it is destructive and affects collaborators.
2. Run connected positive-path M2M, mint/B2B, messaging/RLS, receipt-sync, and order-keeper smokes in an approved wallet runner. This pass intentionally did not read or use a persistent wallet private key or service-role value.

### P1/P2 governance and live controls

1. Resolve extension-owned `public.spatial_ref_sys` RLS through Supabase owner/admin authority if Advisor still reports it.
2. Upgrade the GitHub plan or move the deployment repository if platform-enforced environment reviewers/wait timers are required; protected-branch environment policies are already enabled.
3. Approve the supplier media-origin policy before adding new CDN hosts to CSP, browser smoke, or `ATP2_AI_IMAGE_ALLOWED_HOSTS`.
4. Obtain an independent human application-security review and continue periodic dependency/secret scans; local automated checks cannot prove absence of unknown vulnerabilities.
5. Decide whether Cloudflare Web Analytics/challenge injection should be disabled. Strict CSP currently blocks its dynamic inline scripts rather than permitting `unsafe-inline`; application scripts and routes continue to load.
