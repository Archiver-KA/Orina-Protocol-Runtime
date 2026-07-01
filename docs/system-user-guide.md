# Orina Protocol Runtime User Guide

Last aligned with runtime code and deployment metadata on 2026-07-01.

This guide describes the current `Orina Protocol - Runtime` application, not the older documentation site snapshot. The live beta protocol surface is ATP v3.5 on operated testnets, backed by a React/Vite client, Wagmi/Viem wallet flows, Supabase REST/Edge Functions, and local wallet-scoped runtime caches.

## Current Runtime Baseline

- Frontend: React, TypeScript, Vite, Tailwind, Wagmi, Viem.
- Wallet connector: browser injected EIP-1193 wallets, with MetaMask as the primary tested wallet.
- Live protocol networks: BNB Chain Testnet `97`, Base Sepolia `84532`, Arbitrum Sepolia `421614`, and Ethereum Sepolia `11155111`.
- Default protocol namespace: `orina-atp-v3.5-fee-split-nft-orifee-bsc-testnet-20260604`.
- Network-specific marketplace, asset, receipt, payment, and M2M addresses are selected from `src/config/contracts.ts` through the protocol network router.
- Supported payment token list in the client: chain-scoped testnet `USDT.t`, `USDC.t`, optional wrapped native where configured, and `ORI`.
- Protocol fee model: no burn; USDT/USDC fee token total is 2% (`1%` platform + `1%` DAO), ORI fee token total is 1% (`0.5%` platform + `0.5%` DAO).

Other networks can appear in the UI as coming-soon or governance-blocked options, but protocol writes are enabled only for networks marked `live`.

Base Sepolia contract deployment metadata is included in the runtime configuration: chain id `84532`, `MarketplaceATP` `0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14`, `FeeManager` `0x51aB383A43d79f4127B7E7dCBcd892164FA2838F`, and `PaymentGateway` `0x1A880Ae46993282dd77C2dDCc5e36498eB616C92`. Base Sepolia is write-enabled after the 2026-06-28 bytecode and Marketplace M2M delegation checks.

Arbitrum Sepolia is available as a live testnet target: chain id `421614`, RPC `https://sepolia-rollup.arbitrum.io/rpc`, explorer `https://sepolia.arbiscan.io`, namespace `orina-atp-v3.5-arbitrum-sepolia-eoa-testnet-20260629`. Contracts are deployed, bytecode-checked, and M2M-linked. Governance for this testnet uses deployer EOA through a zero-delay timelock because multisig signing is unavailable on Arbitrum Sepolia; mainnet must redeploy with the production multisig/Safe and replace the address set.

Ethereum Sepolia is available as a live testnet target: chain id `11155111`, RPC `https://ethereum-sepolia-rpc.publicnode.com`, explorer `https://sepolia.etherscan.io`, namespace `orina-atp-v3.5-ethereum-sepolia-eoa-testnet-20260701`. Contracts are deployed, bytecode-checked, and M2M-linked. Governance for this testnet uses deployer EOA through a zero-delay timelock, matching the temporary Arbitrum Sepolia path; Ethereum mainnet must redeploy with the production multisig/Safe, non-zero timelock delay, and a fresh address set.

## Local Startup

Install dependencies once:

```powershell
npm install
```

Start the runtime app:

```powershell
npm run dev
```

Vite normally serves the app at `http://localhost:5173/`. Use `5173` for the app and `9222` only for Chrome DevTools Protocol automation.

Build a release bundle:

```powershell
npm run build
```

Run the normal release gate:

```powershell
npm run verify:viewer-release
```

## Access Modes

The runtime distinguishes four access modes:

| Mode | Trigger | What the user can do |
| --- | --- | --- |
| Guest disconnected | No wallet connected | View public home, marketplace, search, community, asset details, collection details, and profiles. |
| Guest forced | Guest mode flag is enabled | Same as guest disconnected, even if a wallet exists. |
| Auth pending | Wallet connected but wallet auth session is not established | UI/social surfaces can load, but protocol writes remain blocked. |
| User connected | Wallet connected and `orina_wallet_auth_session` is valid | Full wallet-scoped app surface and protocol write actions. |

Guest users can inspect listings and profiles but cannot mint, buy, favorite, follow, message privately, or open protocol actions.

## Main Navigation

The connected runtime shell uses the left sidebar and top navigation:

- `Overview`: dashboard and summary widgets.
- `Orders`: ATP order lifecycle, countdowns, buyer/seller actions, disputes.
- `Marketplace`: active listing catalog with asset/profile modes and grid/list/map views.
- `Insights`: order and market activity views.
- `Minting`: seller workspace for RWA/NFT asset record creation.
- `Assets`: wallet-owned runtime assets, receipt NFTs, and seller asset management.
- `Messages`: direct conversations backed by the messaging service when configured.
- `Community`: public posts, comments, and profile discovery.
- `Agent Setting`: API keys, AI assistant, AI M2M wallet, and seller automation settings.
- `Settings`: profile, delivery addresses, theme, wallet-scoped preferences.

When connected on an operated testnet, the top navigation can expose `Testnet Starter Kit`. That modal guides native gas setup, testnet-only `USDT.t` / `USDC.t` claims, and QA rankings.

The top search bar navigates to `/search` and can search assets, profiles, collections, and taxonomy categories.

## Wallet And Network Setup

1. Install and unlock MetaMask or another injected wallet.
2. Connect wallet from the top-right wallet button.
3. Switch to a live runtime testnet: BNB Chain Testnet `97`, Base Sepolia `84532`, Arbitrum Sepolia `421614`, or Ethereum Sepolia `11155111`.
4. Keep the selected network's native test gas available.
5. Use one of the configured ERC-20 payment tokens for protocol purchases. Native gas pays transaction fees; payment tokens are ERC-20 assets.

For beta testing, use the Testnet Starter Kit modal only on operated testnets. `USDT.t` and `USDC.t` are faucet-minted mock tokens and must not be treated as mainnet stablecoins.

If the app asks for a wallet security check, sign the requested message. That creates the wallet-auth session used for owner-scoped Supabase writes and sensitive settings.

## Profile And Settings

Open `Settings` after connecting a wallet.

Recommended setup:

1. Set display name, avatar, profile story, and public identity fields.
2. Add at least one delivery address.
3. Mark the preferred delivery address as default.
4. Confirm the theme and notification preferences.
5. If you use AI tools, configure API keys and AI assistant settings from `Agent Setting`.

Profile and preference data is wallet scoped. Important local keys include:

- `user_profile_<address>`
- `orina_user_settings_<address>`
- `orina_delivery_addresses_<address>`
- `orina_wallet_auth_session`
- `orina_supabase_auth_claim_bridge_session`

When Supabase is configured, profile, delivery, community, message, review, API key, and AI data can sync remotely. The browser still keeps local caches for fast UI recovery and offline-tolerant reads.

## Delivery Address And Asset Location

Delivery addresses use a geo hierarchy:

- `geo_countries`
- `geo_places`
- `user_delivery_addresses`

When a seller mints an RWA, the selected delivery source is snapshotted into the asset metadata as `assetLocationSnapshot` and `deliverySnapshot`. Marketplace map pins use the snapshot coordinates when available. Changing the seller's default address later does not rewrite already minted asset snapshots.

## Marketplace And Search

The marketplace catalog is hydrated from Supabase and in-memory runtime cache:

- `assets_catalog`: listing metadata.
- `profiles`: seller display and verification metadata.
- `asset_protocol_links`: links listings to on-chain assets.
- `protocol_assets`: chain projection for availability.
- `protocol_orders`: reserved amount and order state projection.
- `get_asset_listing_stats_v1`: view/like stats RPC.

The client no longer uses a durable localStorage marketplace catalog cache. It starts from memory and hydrates from Supabase when REST config is available.

Marketplace views:

- `Grid`: visual card browsing.
- `List`: denser comparison view.
- `Map`: location view based on asset snapshots.
- `Profiles`: seller/profile discovery.

Search uses the same marketplace catalog and seller directory. Recent searches are stored locally.

## Buying Flow

Use this path for RWA purchase actions:

1. Connect wallet and switch to a live runtime testnet.
2. Open `Marketplace` or `Search`.
3. Open an asset detail route.
4. Review seller profile, price, unit, quantity, payment token, and configurable attributes.
5. Select a delivery address if the flow asks for one.
6. Sign the buyer order request.

The default ATP order payload is EIP-712 signed as:

```text
Order(orderId,buyer,seller,paymentToken,assetId,grossPrice,amount,estDeliverySeconds)
```

When the protocol fee is paid in a different token from the payment token, the buyer signs:

```text
OrderWithFeeToken(orderId,buyer,seller,paymentToken,feeToken,assetId,grossPrice,amount,estDeliverySeconds)
```

For the v3.5 beta runtime, USDT/USDC purchases can keep the fee in the payment token at total 2%, or pay protocol fee in ORI at total 1%. The beta UI uses a 1:1 ORI/payment-token assumption; production must use the oracle quote layer before signature and escrow.

The purchase lifecycle is:

1. Buyer calls `createOrder`, or `createOrderWithFeeToken` when `feeToken != paymentToken`; funds and protocol fee are escrowed through `PaymentGateway`.
2. Seller has 24 hours to call `sellerConfirm`.
3. If the seller changes the delivery time, buyer has 24 hours to re-accept through `payOrder`.
4. Once payment is committed, the order enters the delivery period.
5. Buyer can confirm delivery before the delivery timer ends.
6. After delivery time ends, the buyer has a 3-day Awaiting Auto Finalize window to confirm delivery or open a dispute.
7. If no buyer action happens, protocol auto-finalize can release according to the ATP state.

Never send funds outside the protocol escrow flow.

## Selling And Minting Flow

Before minting:

1. Connect seller wallet.
2. Set profile identity.
3. Add and review the default delivery address.
4. Prepare images, description, category, unit, quantity, price, and delivery settings.

Open `Minting`:

1. Choose `RWA` for real-world asset records or `NFT` for transferable ERC721 asset listings.
2. Enter asset name, description, media, category, price, and amount.
3. For RWA, choose unit and expiry behavior.
4. Add configurable buyer attributes if required.
5. Review the preview panel and mint.
6. Approve wallet security and transaction prompts.

RWA orders mint non-transferable post-finalization receipt NFTs and revert transfer attempts with `RWA receipt non-transferable`. NFT orders mint transferable ERC721 tokens after finalization.

Minted runtime records are cached under:

```text
orina_runtime_minted_assets_v2:<chainId>:<assetContract>
```

When Supabase REST is available, minted records hydrate from `protocol_assets` and the marketplace catalog can display active projected listings.

## Orders

Open `Orders` for buyer and seller actions.

Main lifecycle labels:

- `Waiting Seller Confirm`
- `Seller Confirm Expired`
- `Waiting Buyer Re-Sign`
- `Buyer Re-Sign Expired`
- `Agreed Delivery`
- `Awaiting Auto Finalize`
- `Auto Finalize Ready`
- `Disputed`
- `Finalized`
- `Cancelled`

Order records are hydrated from `protocol_orders` when Supabase is available and cached under:

```text
orina_runtime_orders_v2:<chainId>:<marketplaceContract>
```

Allowed actions depend on viewer role:

- Seller can confirm or cancel only during seller-confirm window.
- Buyer can accept revised delivery time or cancel only during buyer re-sign window.
- Buyer can confirm delivery during paid delivery/review phases.
- Buyer can open dispute during Awaiting Auto Finalize.

## Disputes

Dispute handling is bound to `DisputeManager`.

Supported paths:

- Buyer opens dispute during the allowed review window.
- Arbiter can resolve with buyer win, seller win, or split.
- Buyer/seller/arbiter agreement can resolve by 2-of-3 signatures.
- Buyer and seller can mutually sign a split path.
- Arbiter can extend dispute once by 14 days.
- Stale disputes can auto-split after the final deadline.

Keep evidence outside the chain as well: tracking links, photos, inspection records, chat logs, and packaging proof.

## Messages, Community, Reviews

Messaging uses Supabase conversations and message tables through the message client and Edge Function surface. Community uses public post/comment/action tables and can fall back to local cache where needed. Reviews and reputation use `profile_reviews`, `protocol_orders`, and derived reputation views.

Guest users can read public community/profile surfaces. Writes require a wallet and, for owner-scoped writes, a wallet auth bridge session.

## AI, API Keys, And M2M

The `Agent Setting` page includes:

- API key management through protected Supabase Edge Function routes.
- AI reply assistant settings for seller messaging.
- Seller AI minting configuration.
- AI M2M delegated wallet controls.

Delegated M2M policy supports bounded expiring sessions and an explicit no-expiry option. No-expiry sessions remain revocable by the root wallet and should be paired with counterparty binding, action-mask limits, per-order caps, total caps, and ATP term policy.

Sensitive API keys are not stored in plain localStorage. API key generation uses wallet auth, Supabase bridge tokens, and server-side key storage. Smoke scripts redact generated keys in output.

## Verification With Port 9222

Use `9222` for Chrome DevTools Protocol automation, not for the Vite app server. See [Port 9222 Runtime Verification](./port-9222-runtime-verification.md).

Minimum local smoke setup:

1. Start the app on `5173`.
2. Start Chrome with `--remote-debugging-port=9222`.
3. Connect MetaMask in that Chrome profile.
4. Run the CDP smoke scripts.

## Operational Rules

- Treat on-chain state as authoritative.
- Treat Supabase `protocol_assets`, `protocol_orders`, and `protocol_order_events` as projections, not contract truth.
- Do not expose service-role keys in any `VITE_*` variable.
- Keep `src/config/contracts.ts`, `src/config/eip712.ts`, and Supabase projection tooling aligned with the same deployment namespace.
- Do not document old mock behavior as current runtime behavior unless the specific page still uses fixtures.
