# Protocol Security Status

Last updated: 2026-07-02

This runtime repository consumes the ATP contract stack and mirrors the current public-safe protocol assurance status. It is not an external audit certificate, legal certification, compliance approval, or mainnet launch approval.

## Contract Assurance Baseline

- Current full Foundry suite passes at 110/110 after dispute-settlement hardening.
- Deep Foundry invariants pass for the current accounting/state harnesses.
- Slither triage has no High or Medium impact findings in the current result set.
- Echidna and Medusa ATP harnesses pass for escrow conservation, asset conservation, tracked order terminality, and delegated identity properties.
- Mythril runtime-bytecode symbolic execution completed for `FeeManager`, `PaymentGateway`, and `MarketplaceATP`; reported findings were source-triaged with no confirmed exploitable issue.
- Certora remote proof passes for the initial `FeeManager` fee-cap scope.
- Current BSC Testnet, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, Avalanche Fuji, and World Chain Sepolia deployments were reconciled against Foundry broadcast artifacts and spot-checked on-chain for bytecode and M2M Marketplace wiring.

## Runtime Relevance

The runtime app must treat this as a testnet assurance baseline, not a production sign-off. UI, backend, indexer, and env configuration must remain aligned with the canonical testnet address sheet and must not mix testnet faucet assets into production builds.

## Remaining Limits

- Broader Certora coverage is pending for Marketplace, Gateway, Dispute, Delegation, and AI wallet contracts.
- Halmos remains a tooling/harness limitation.
- Human review or independent audit is required before production claims.
- M2M `DelegationManager.DEFAULT_ADMIN_ROLE` remains with deployment/admin EOA `0x282Be18838D7079C215F49749a9606d77e00888b` on BSC Testnet and Base Sepolia; Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, Avalanche Fuji, and World Chain Sepolia have DelegationManager admin under their testnet timelocks. World Chain Sepolia must use active M2M `0x5e41f1155AB4E614037C9C481BB8c1d398915cd0` / `0x279c62C97c6967d0E0F45f9D2460d38E3929c090`; its first M2M pair is orphaned because it used a stale Base Sepolia timelock. Production requires governance handoff and fresh mainnet controls.
- Production needs a token allowlist, ORI quote/oracle policy, monitoring, incident runbooks, and final owner sign-off.

## Communication Boundary

Use "internally tested" or "testnet-operated" language. Do not claim "externally audited", "mainnet ready", or "certified" unless a separate third-party report or governance sign-off is published.
