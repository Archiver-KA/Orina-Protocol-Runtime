# ATP Run Log (MarketplaceATP)

Purpose:

- Record each ATP execution run (`CTL` / `LTL` / `ATL` / `EVM Bytecode`)
- Track findings, counterexamples, and follow-up actions
- Keep a durable audit trail aligned with `Audit.md` and `formal/atp/ATP_Findings_Audit_Mapping.md`

Related files:

- `formal/atp/ATP_Findings_Audit_Mapping.md`
- `formal/atp/ATP_Formal_Verification_Checklist.md`
- `Audit.md`

## 1. Run Index

| Run ID | Date (UTC) | Operator | Commit / Ref | ATP Scope | Bytecode / Model Version | Result Summary | Status |
|---|---|---|---|---|---|---|---|
| `ATP-RUN-YYYYMMDD-01` | `YYYY-MM-DDTHH:MM:SSZ` | _(name)_ | _(git commit / tag)_ | `CTL/LTL/ATL/Bytecode` | `v3.3-final` | `0 findings` / `N findings` | `draft` / `reviewed` / `closed` |

## 2. Per-Run Entry Template

Copy this block for each ATP run and update the fields.

### `ATP-RUN-YYYYMMDD-01`

Run metadata:

- Date (UTC): `YYYY-MM-DDTHH:MM:SSZ`
- Operator: `name`
- Commit / Ref: `git-sha-or-tag`
- ATP Scope: `CTL`, `LTL`, `ATL`, `EVM Bytecode` (list all used)
- Marketplace bytecode artifacts:
  - `formal/atp/evm/MarketplaceATP.creation.bytecode.hex` (`sha256: ...`)
  - `formal/atp/evm/MarketplaceATP.runtime.bytecode.hex` (`sha256: ...`)
- Model/spec artifacts:
  - `formal/atp/nusmv/MarketplaceATP_ExecutableModel.smv`
  - `formal/atp/ctl/MarketplaceATP_CTL.spec`
  - `formal/atp/ltl/MarketplaceATP_LTL.spec`
  - `formal/atp/atl/MarketplaceATP_ATL.strategy`
- Audit baseline:
  - `Audit.md` version / commit: `...`
  - Mapping baseline: `formal/atp/ATP_Findings_Audit_Mapping.md` @ `...`

Run summary:

- Total findings: `0`
- CTL failures: `0`
- LTL failures: `0`
- ATL strategy issues: `0`
- Bytecode issues: `0`
- Notes: `...`

Findings table:

| Finding ID | ATP Source | Property / Rule | Counterexample Summary | Counterexample Trace / Link | Mapped `MAP-*` | Classification | Action | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| `ATP-XXX` | `CTL` / `LTL` / `ATL` / `Bytecode` | _(property name / spec line)_ | _(short summary)_ | _(URL / screenshot / trace id / pasted path)_ | `MAP-00X` / `N/A` | `code bug` / `audit mismatch` / `model mismatch` / `tooling` | _(fix code / update audit / refine model / ignore false positive)_ | _(name)_ | `open` / `resolved` |

Action log:

| Time (UTC) | Action | Files Changed | Verification | Notes |
|---|---|---|---|---|
| `YYYY-MM-DDTHH:MM:SSZ` | _(what was done)_ | `src/...`, `Audit.md`, `formal/...` | `forge test ...`, ATP rerun, manual review | _(optional)_ |

Resolution summary:

- Final disposition: `clean` / `open issues remain`
- Follow-up required: `yes/no`
- Links:
  - PR / commit: `...`
  - ATP report export: `...`
  - Counterexample archive: `...`

## 3. Naming Conventions

- Run IDs: `ATP-RUN-YYYYMMDD-##`
- Finding IDs: `ATP-<tool>-<seq>` or ATP UI-native ID if provided
- Keep `MAP-*` links synced with `formal/atp/ATP_Findings_Audit_Mapping.md`

## 4. Classification Rules (Quick Reference)

- `code bug`: reproducible against Solidity/Foundry behavior
- `audit mismatch`: `Audit.md` disagrees with code + ATP/formal evidence
- `model mismatch`: abstraction/spec (`NuSMV`/`ATL`) is wrong
- `tooling`: interface, config, artifact, or ATP input issue

