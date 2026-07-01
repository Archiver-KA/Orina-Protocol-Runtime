# Orina Protocol Runtime FAQ

Last aligned with runtime code on 2026-06-29.

## General

### What is Orina Protocol Runtime?

It is the current production-facing runtime app for Orina Protocol. It includes the React frontend, wallet flows, operated ATP v3.5 beta testnet contracts, Supabase runtime surfaces, Edge Functions, release checks, and current-code documentation.

### Which network is live right now?

The live write-enabled runtime networks are BNB Chain Testnet `97`, Base Sepolia `84532`, Arbitrum Sepolia `421614`, and Ethereum Sepolia `11155111`. Arbitrum Sepolia and Ethereum Sepolia use EOA-controlled zero-delay timelock governance for testnet only; mainnet must be redeployed with the production multisig/Safe and a non-zero timelock delay.

### What does ATP mean in this repo?

ATP means Atomic Transaction Protocol: escrowed bilateral order flow, seller confirmation, delivery timing agreement, dispute-managed settlement, receipt minting, and optional AI/M2M delegated execution bound to the same protocol contracts.

### Is marketplace data mocked?

The marketplace/search catalog is no longer a durable mock-first catalog. The runtime hydrates active listings from `assets_catalog`, joins seller/profile data, and enriches availability from `protocol_assets` and `protocol_orders`. Some overview widgets, visual summaries, test fixtures, and empty-state fallbacks may still be presentation/demo-oriented.

### Can I browse without a wallet?

Yes. Guest users can view home, marketplace, search, community, asset details, collection details, and profiles. Writes and protocol actions require a connected wallet.

## Wallet And Access

### Why can I connect a wallet but still be blocked from some actions?

Connecting a wallet is not always enough. Sensitive writes and protocol actions may require a wallet-auth session. The app stores that session under `orina_wallet_auth_session` after the user signs the required security message.

### Which wallet is tested?

The runtime is configured for injected EIP-1193 wallets. MetaMask is the primary tested browser wallet in local smoke scripts.

### What chain should MetaMask use?

Use the selected live testnet. Current write-enabled choices:

- BNB Chain Testnet: chain id `97`, hex `0x61`, gas token `tBNB`, explorer `https://testnet.bscscan.com`
- Base Sepolia: chain id `84532`, hex `0x14a34`, gas token `ETH`, explorer `https://sepolia.basescan.org`
- Arbitrum Sepolia: chain id `421614`, hex `0x66eee`, gas token `ETH`, explorer `https://sepolia.arbiscan.io`
- Ethereum Sepolia: chain id `11155111`, hex `0xaa36a7`, gas token `ETH`, explorer `https://sepolia.etherscan.io`

### Why does a transaction ask for WBNB/USDT/USDC/ORI instead of native BNB?

The protocol payment flow uses ERC-20 payment tokens. Native BNB pays gas. WBNB is the wrapped payment-token form.

## Marketplace And Search

### Why is the marketplace empty locally?

Common causes:

- Supabase env is not configured.
- `VITE_ENABLE_SUPABASE_CONFIG_FALLBACK=false` with no project URL/key.
- `assets_catalog` has no active visible rows.
- Projection guardrails hide rows without valid protocol projection.
- The app just started and hydration has not completed.

### Why does a map marker not appear for an asset?

Marketplace map markers require an `assetLocationSnapshot` with coordinates. Those coordinates come from geo country/place data or a saved delivery snapshot. The runtime should not invent random coordinates.

### Why do search and marketplace show the same assets?

They intentionally share `marketplaceCatalog.ts`. Search adds query/filter UI and seller directory lookups, but uses the same active catalog data path.

### Where are views and likes stored?

The runtime uses local deltas for immediate feedback and syncs canonical listing stats through Supabase RPC when available.

## Buying

### What is the current order signing payload?

The default EIP-712 order payload is:

```text
Order(orderId,buyer,seller,paymentToken,assetId,grossPrice,amount,estDeliverySeconds)
```

When the buyer pays protocol fee with a token different from the payment token, the buyer signs:

```text
OrderWithFeeToken(orderId,buyer,seller,paymentToken,feeToken,assetId,grossPrice,amount,estDeliverySeconds)
```

Older payloads without `paymentToken` and `assetId` are obsolete.

### Can USDT/USDC purchases pay protocol fee in ORI?

Yes. In the v3.5 beta runtime, USDT/USDC purchases can pay fee in the payment token at total 2%, or pay fee in ORI at total 1%. The beta path assumes ORI/payment-token parity; mainnet needs an oracle quote before signing and escrow.

### What are the buyer steps?

1. Open an asset.
2. Review quantity, payment token, unit, seller, delivery terms, and configurable attributes.
3. Sign `createOrder`.
4. Wait for seller confirmation.
5. If the seller revises delivery time, sign `payOrder` within 24 hours.
6. Confirm delivery when received, or open dispute during the allowed review window.

### Can the buyer cancel?

The buyer can cancel in the buyer re-sign window if the seller revised terms and the buyer does not want to accept. After payment is committed, normal cancellation is no longer the path; delivery confirmation, dispute, or protocol timeout handling takes over.

### Can the seller cancel?

The seller can cancel only during the seller confirmation window. Once the order is paid/committed, seller actions are constrained by fulfillment and dispute flows.

## Selling And Minting

### What should a seller configure before minting?

Set profile identity and default delivery address first. The RWA mint path snapshots delivery/location data, so incorrect settings can produce incorrect asset metadata.

### What local key stores minted runtime assets?

```text
orina_runtime_minted_assets_v2:<chainId>:<assetContract>
```

Supabase hydration can merge protocol projection rows from `protocol_assets` back into this local view.

### Can I change asset location after minting?

Changing Settings later does not rewrite old asset snapshots. Correct major mistakes by creating a corrected listing/projection according to the active protocol and catalog process.

### Is NFT minting fully equivalent to RWA minting?

No. The v3.5 protocol supports two asset outcomes: RWA orders mint non-transferable receipt NFTs after finalization, while NFT orders mint transferable ERC721 tokens after finalization. The direct-buy lifecycle still uses ATP escrow, seller confirmation, delivery/review, and dispute handling.

## Orders And Disputes

### What are the main order phases?

`Waiting Seller Confirm`, `Waiting Buyer Re-Sign`, `Agreed Delivery`, `Awaiting Auto Finalize`, `Auto Finalize Ready`, `Disputed`, `Finalized`, and `Cancelled`.

### How long does the seller have to confirm?

24 hours from the buyer proposal time.

### How long does the buyer have to re-sign after revised delivery terms?

24 hours from seller confirmation when a buyer re-sign is required.

### What is Awaiting Auto Finalize?

After the agreed delivery time ends, the buyer has a 3-day window to confirm delivery or open dispute. If no buyer action happens, protocol auto-finalize can take over at the end.

### How do disputes resolve?

The current hooks support arbiter resolution, 2-of-3 agreement resolution, mutual split, one-time extension, and stale dispute auto-split after deadline.

### What evidence should users keep?

Tracking numbers, courier status, packaging photos/video, inspection photos, communication records, and any documents needed to prove shipment, delivery, damage, authenticity, or non-delivery.

## Data And Storage

### Which data is on-chain?

Contract state for assets, orders, escrow, dispute lifecycle, receipts, and role-enforced actions is canonical on-chain.

### Which data is in Supabase?

Supabase holds public catalog/profile/community/message/review data, geo data, API/AI records, and chain projection mirrors such as `protocol_assets` and `protocol_orders`.

### Which data is local?

Wallet-scoped settings, profile cache, delivery cache, runtime order cache, runtime minted asset cache, search history, UI preferences, bridge session, and selected protocol network can be local.

### Can I expose Supabase service-role keys in Vite?

No. Only anon/publishable public keys belong in `VITE_*`. Service-role keys, JWT secrets, and delegate encryption keys belong only in server/Edge Function secret storage.

## Port 9222 And Smoke Tests

### Is port 9222 the app port?

No. The app normally runs on `5173`. Port `9222` is the Chrome DevTools Protocol endpoint used by smoke scripts.

### What does the CDP smoke setup need?

1. Runtime app running on `5173`.
2. Chrome launched with `--remote-debugging-port=9222`.
3. A dedicated Chrome profile for that debug session.
4. MetaMask installed and unlocked if wallet flows are tested.
5. Node runtime with global `fetch` and `WebSocket` support.

### Which scripts use 9222?

- `scripts/attach-metamask-smoke.mjs`
- `scripts/smoke-asset-modal-navigation.mjs`
- `scripts/smoke-api-key-generate.mjs`

See [Port 9222 Runtime Verification](./port-9222-runtime-verification.md).

## Troubleshooting

### Chrome debug endpoint does not respond.

Close all Chrome windows using the same profile and relaunch with a dedicated `--user-data-dir`. If an existing Chrome profile is already open, Chrome can ignore the remote-debugging flag.

### MetaMask says there is a pending request.

Open the extension and complete or reject the pending request. Then retry the app action.

### Orders do not show after refresh.

Check wallet address, chain id, Supabase REST configuration, and local key `orina_runtime_orders_v2:<chainId>:<marketplaceContract>`. If Supabase is unavailable, only local cached orders can load.

### Minted assets do not show.

Confirm the same wallet and live chain are selected. Then check `orina_runtime_minted_assets_v2:<chainId>:<assetContract>` and whether `protocol_assets` hydration is available.

### API key generation fails.

Check wallet auth session, Supabase function namespace, bridge token creation, and `VITE_SUPABASE_URL`/anon key configuration. The smoke script can verify this path through Chrome CDP and redacts generated keys.
