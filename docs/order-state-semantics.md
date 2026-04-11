# Order State Semantics

This document defines the normalized business semantics used by client lifecycle, display, and analytics.

## Core Rules

- On-chain protocol fields remain the source of truth for raw order state.
- `finalized` is a closure flag, not a synonym for successful completion.
- Display and analytics must normalize terminal outcomes into one business outcome per order.

## Terminal Precedence

1. `CANCELLED`
2. `DISPUTED`
3. `COMPLETED`
4. `OPEN`

## Canonical Tuple Decisions

### `state = CANCELLED`, `finalized = true`

- Normalized outcome: `cancelled`
- Closure semantics: `closed`
- Completed metrics: `false`
- Delivery confirmed: `false`

### `state = FINALIZED`, `finalized = true`

- Normalized outcome: `completed`
- Closure semantics: `closed`
- Completed metrics: `true`
- Delivery confirmed: `true`

## Invariants

- `CANCELLED` must never be counted as completed.
- `CANCELLED` must never set delivery confirmed.
- Display lifecycle and analytics must read from the same normalized semantics.
- Projection and runtime rows may cache raw state, but must not invent different business meaning.