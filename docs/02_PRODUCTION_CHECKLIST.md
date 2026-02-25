# Production Marketplace Checklist

Version: 3.3-final  
Date: 2026-02-13  
Mode: Zero-Trust / Adversarial

## Section 1 - Domain Authority Model
- [ ] Financial truth source defined (escrow/order/ownership on-chain).
- [ ] Social truth source defined (profile/messenger/community/reviews in DB).
- [ ] UI preferences scoped to localStorage cache only.
- [ ] No dual-source authority per domain.
- [ ] No client-derived financial state marked authoritative.

## Section 2 - Smart Contract Integration
- [ ] Production contract addresses hard-verified.
- [ ] ABI version matches deployed bytecode.
- [ ] ChainId locked and validated in UI/backend.
- [ ] Write flows tested: create, pay, confirmRelease, cancel, autoRelease.
- [ ] Read flows tested: fresh, mid, completed, cancelled states.
- [ ] Event coverage validated for all critical transitions.
- [ ] UI never overrides contract state.
- [ ] UI re-reads contract on refresh.
- [ ] RPC failure handling tested.
- [ ] Pending transaction UX tested.
- [ ] Double-submit prevention tested.
- [ ] Frontend replay logic rejected.

## Section 3 - Wallet Authentication & Identity
- [ ] Wallet connect works and address normalized lowercase.
- [ ] Chain mismatch detection enforced.
- [ ] Sign-message challenge implemented.
- [ ] Backend signature verification enabled.
- [ ] Session/JWT derived only from verified signer.
- [ ] Backend never trusts client-supplied wallet address.
- [ ] Expired session handling validated.
- [ ] Signature replay prevention validated.
- [ ] Nonce/timestamp challenge invalidated after use.

## Section 4 - Database Architecture (Supabase)
- [ ] Schema with PK/FK/unique/indexes validated.
- [ ] RLS enabled on all user tables.
- [ ] Policy isolation (`user_id = auth.uid()` or equivalent) validated.
- [ ] No accidental public table.
- [ ] Service role key absent from frontend bundle.
- [ ] Orphan record prevention and delete policy defined.
- [ ] Pagination and query plans validated.

## Section 5 - Event Indexer (If Used)
- [ ] Event listener persists blockNumber + unique txHash.
- [ ] Idempotent processing verified.
- [ ] Duplicate event prevention validated.
- [ ] Reorg policy documented and tested.
- [ ] Restart safety and no-gap replay verified.

## Section 6 - Escrow Flow Validation
- [ ] Two-wallet full lifecycle completed.
- [ ] UI matches on-chain at each transition.
- [ ] Mid-transaction refresh safe.
- [ ] Disconnect/reconnect safe.
- [ ] Reload after finalization safe.
- [ ] No double execution or client race issue.

## Section 7 - Social Layer
- [ ] Profile updates restricted to owner.
- [ ] Messenger sender derived from verified session.
- [ ] Rate limits and message-size limits active.
- [ ] Community ownership rules enforced.
- [ ] Like/upvote uniqueness constraints active.
- [ ] Reputation not client-authoritative.

## Section 8 - Search & Marketplace Index
- [ ] Search index treated as view-only.
- [ ] Asset detail page always re-fetches authoritative state.
- [ ] Price display reconciles with contract reads.
- [ ] Sorting/pagination stable on large dataset.

## Section 9 - localStorage Controls
- [ ] Keys scoped by address + chainId.
- [ ] Corrupted JSON handling safe.
- [ ] Migration and reset idempotent.
- [ ] Multi-tab consistency tested.
- [ ] Manual tampering does not alter authoritative outcomes.

## Section 10 - Security Hardening
- [ ] No frontend-exposed secrets.
- [ ] `.env` excluded from repo.
- [ ] CSP and XSS protections active.
- [ ] API payload validation active.
- [ ] Forged API request denied.
- [ ] Cross-user data access denied.

## Section 11 - Observability & Operations
- [ ] Structured logs and error monitoring active.
- [ ] Contract tx failure logging active.
- [ ] Health checks and alerting active.
- [ ] Rollback and backup plan documented.

## Section 12 - Performance & Stability
- [ ] Acceptable cold-start and high-latency RPC behavior.
- [ ] DB performance under load validated.
- [ ] UI responsive with high volume orders/messages/search.
- [ ] No listener leaks or render loops.

## Section 13 - Final Production Gate
- [ ] Two independent wallets complete end-to-end without manual intervention.
- [ ] No cross-user data leak.
- [ ] No production console red errors.
- [ ] No financial mismatch between UI and contract.
- [ ] All critical invariants pass.

If any critical item fails: NOT PRODUCTION READY.
