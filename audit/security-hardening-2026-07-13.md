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
- `npm test`: 26 test files / 109 tests pass; the suite includes URL/SSRF, response bounds, wallet-session, scanner-policy, supplier-data, and effective-grant coverage.
- `npm run security:scan`: pass, including P0 static invariants, CORS, auth, M2M, messaging, IPFS, rate limiting, dependency, and Data API decisions.
- SQL parser: 84 migrations / 1,423 statements parsed successfully.
- `npm run verify:assurance-invariants`, `verify:repo-tooling`, `verify:protocol-runtime-surface`, `verify:testnet-networks`, `audit:supabase:data-api-grants`, `verify:marketplace-freshness`: pass.
- `npm run build`: pass; 238 public routes prerendered and `_headers` copied to `dist`.
- `npm run verify:deterministic-build`: pass; 355 files in both builds with zero differences.
- `git diff --check`: pass.

## Secret scan evidence

Gitleaks v8.30.1 was checksum-verified before use.

- Git history: 102 heuristic detections. Ninety-one are generic patterns; four are documentation curl-auth examples; four are historical public Supabase anon JWTs; three are a RapidAPI access-token pattern in commit `c863244ff85d16991907fc83defcc9c179fd1b52` (`orina_agent/tool_kit_API.md`). Treat the RapidAPI credential as compromised until the owner confirms rotation.
- Current tracked source: no confirmed embedded secret after triage; generic detections are environment names, public contract addresses, and generated chain-projection fixtures.
- Ignored local files were not opened or printed, but the scan found secret-like material, including GitHub fine-grained PAT patterns in `.env` and `supabaseJWT.md`. These files are ignored by Git. The owner must rotate/verify those credentials and securely remove stale local copies.

## Residual owner actions

### P0 before production approval

1. Rotate or conclusively revoke the historical RapidAPI token and both local GitHub PAT-like credentials. Decide whether coordinated Git history rewriting is required; it was not performed because it is destructive and affects collaborators.
2. Apply migrations `000082`–`000084` and deploy the relational-only Edge bundle in one approved maintenance window. Migration `000084` intentionally revokes legacy KV runtime access.
3. Run the live `SECURITY DEFINER` audit and the updated wallet-claim, M2M, mint/B2B, messaging/RLS, receipt-sync, CORS, and order-keeper smokes against the target project. No production credential or wallet was used during this repository-only pass.

### P1/P2 governance and live controls

1. Resolve extension-owned `public.spatial_ref_sys` RLS through Supabase owner/admin authority if Advisor still reports it.
2. Confirm GitHub branch protection, production/wallet-smoke environment reviewers, Cloudflare `_headers` delivery, release-artifact signing, and secret rotation policy outside the repository.
3. Approve the supplier media-origin policy before adding new CDN hosts to CSP, browser smoke, or `ATP2_AI_IMAGE_ALLOWED_HOSTS`.
4. Obtain an independent human application-security review and continue periodic dependency/secret scans; local automated checks cannot prove absence of unknown vulnerabilities.
