# Security

Last verified by Codex audit: 2026-05-12

## Reporting

This repository does not currently publish a dedicated public vulnerability intake address. Report security issues through the project maintainer channel used for this repository, and do not include raw secrets, private keys, service-role keys, JWT signing secrets, or generated API keys in issue text or logs.

## Supported Source

The current supported source is the runtime repository on `main` plus the release gate in `.github/workflows/protocol-release-gate.yml`.

## Runtime Security Assumptions

- Browser-exposed `VITE_*` values may contain only public Supabase URL/project/anon or publishable configuration.
- Supabase service-role keys, JWT secrets, delegate encryption keys, Pinata credentials, and database audit URLs belong only in server, Edge Function, CI secret, or local operator environments.
- Wallet auth and Supabase bridge sessions are stored in localStorage and are sensitive to same-origin XSS.
- Protected Edge Function writes must require H1 wallet claim JWTs and wallet-address matching.
- Upload, chat, AI, and moderation write paths should use the distributed rate limiter backed by `public.rate_limit_increment`.
- Public marketplace browse RPCs may be readable by `anon` and `authenticated`, but `SECURITY DEFINER` functions must be reviewed in `scripts/audit-supabase-security-definer.mjs`.

## Verification

Run the repository security checks before release:

```bash
npm run security:check-client-secrets
npm run security:scan
npm run audit:supabase:security-definer
```
