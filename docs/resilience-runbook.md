# Resilience Runbook

Last updated: 2026-05-20

This runbook defines the repo-local defensive controls for timeout, retry, circuit breaker, idempotency, and degradation behavior. It does not claim production SLOs, branch protection, signing, eBPF, or service-mesh enforcement without owner-provided infrastructure evidence.

## P0 Runtime Defense

Shared browser fetch protection lives in `src/utils/resilience.ts`.

Required behavior:

- Every protected browser network boundary should set `X-Orina-Request-Id`.
- Read requests may retry transient failures with exponential backoff and jitter.
- Unsafe writes must not retry unless the caller supplies an idempotency key and the server path is designed to tolerate duplicate delivery.
- Circuit breakers must be dependency-scoped, not global.
- Circuit-open responses must fail fast and surface a recoverable UI message.

Current integrations:

- `src/utils/supabaseRest.ts`: timeout, safe-read retries, and read/write circuit breakers for Supabase REST.
- `src/utils/apiKeysClient.ts`: request correlation and circuit protection; protected writes send an idempotency header. Revoke/delete writes may retry once; API key generation does not retry because the one-time raw key response is intentionally not replay-stored.
- `src/utils/aiM2MWalletClient.ts`: request correlation and circuit protection; protected writes send an idempotency header and may retry once through server-side replay.
- `supabase/functions/server/edge-app.ts`: CORS now permits and echoes Orina request correlation headers.
- `supabase/functions/server/idempotency-replay.ts`: Edge middleware claims unsafe JSON writes by hashed `Authorization` scope plus `Idempotency-Key`, replays completed non-secret responses, returns `425 Retry-After` for in-flight duplicates, and blocks duplicate delivery for secret-bearing responses without storing the secret body.
- `supabase/migrations/000075_edge_idempotency_replay.sql`: service-role-only replay table with deny-all RLS for browser/API roles.

## Retry Policy

Retry only:

- HTTP `408`, `425`, `429`, `500`, `502`, `503`, `504`
- network failure
- timeout

Do not automatically retry:

- wallet signing
- wallet transaction submission
- escrow/order/finality mutation
- API key generation, because the raw key is a one-time secret and must not be persisted for replay
- escrow/order/finality mutation until route-specific transaction-level idempotency is implemented

## Circuit Breaker Policy

Use these defaults unless a narrower policy is documented:

| Dependency | Failure threshold | Open duration | Retry |
| --- | ---: | ---: | --- |
| Supabase REST read | 4 failures | 15s | safe reads only |
| Supabase REST write | 2 failures | 30s | no automatic retry |
| Edge API key routes | 4 read / 2 write failures | 15s read / 30s write | reads, revoke/delete replay-safe writes |
| AI M2M routes | 4 read / 2 write failures | 15s read / 30s write | reads and replay-safe writes |

Circuit state is currently browser-memory only. For production-grade shared circuit state across Edge instances, add a service-side state store such as Supabase, Cloudflare KV, or Edge Config after owner approval.

## P1 Operations

Add dashboards and alerts around:

- request volume by `X-Orina-Operation`
- timeout count
- retry count
- circuit-open count
- `429` rate-limit responses
- Supabase `5xx`
- Edge Function `5xx`
- marketplace index staleness
- wallet-auth bridge failure rate

Incident runbooks should cover:

- Supabase degraded or read/write timeout spike
- Edge Function timeout spike
- supplier API outage
- AI provider outage
- wallet-auth bridge failure
- marketplace freshness staleness
- duplicate or stuck critical write investigation

## P2 Infrastructure

P2 controls require owner infrastructure scope:

- eBPF, Tetragon, or Falco only apply to owned Linux hosts, self-hosted runners, or clusters.
- Service mesh or zero-trust network policy only applies after owned service-to-service topology is defined.
- Cloudflare Workers and Supabase managed Edge do not expose kernel telemetry to this repository.

Acceptance criteria before P2 implementation:

- target host or cluster inventory
- non-production pilot target
- alert destination
- rollback path
- owner-approved telemetry retention
- secret-free log policy
