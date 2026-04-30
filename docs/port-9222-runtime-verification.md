# Port 9222 Runtime Verification Runbook

Last aligned with runtime code on 2026-04-25.

Port `9222` is reserved for Chrome DevTools Protocol (CDP) automation. It is not the Vite app port. The normal local pairing is:

- App: `http://localhost:5173/`
- Chrome CDP endpoint: `http://127.0.0.1:9222/`

## Prerequisites

- Runtime dependencies installed with `npm install`.
- Node runtime with global `fetch` and `WebSocket` support.
- Chrome or Chromium.
- MetaMask installed in the debug Chrome profile when wallet flows are tested.
- Test wallet funded with BNB Chain Testnet gas.

## Start The App

```powershell
npm run dev
```

If Vite chooses a different port, pass that port into smoke scripts with `--match-url` and `--goto`.

## Start Chrome On Port 9222

Use a dedicated profile so an already-open Chrome process cannot ignore the debug flag:

```powershell
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$profile = "$env:TEMP\orina-cdp-profile"
Start-Process $chrome -ArgumentList @(
  "--remote-debugging-port=9222",
  "--user-data-dir=$profile",
  "--no-first-run",
  "--new-window",
  "http://localhost:5173/"
)
```

If Chrome is installed under `Program Files (x86)`, adjust `$chrome`.

Verify CDP is reachable:

```powershell
Invoke-RestMethod http://127.0.0.1:9222/json/version
```

Expected result: a JSON object with browser metadata and `webSocketDebuggerUrl`.

## Connect Wallet And Chain

1. Install MetaMask in the debug profile if needed.
2. Unlock it.
3. Open the runtime app tab.
4. Connect wallet.
5. Switch to BNB Chain Testnet (`97`).

The smoke script can request the chain switch:

```powershell
node scripts/attach-metamask-smoke.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --match-url localhost:5173 `
  --goto http://localhost:5173/ `
  --ensure-chain 97 `
  --inspect-target
```

## List Available CDP Targets

```powershell
node scripts/attach-metamask-smoke.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --list
```

Use this when the script attaches to the wrong tab or cannot find `localhost:5173`.

## Connected Runtime Smoke

This checks the connected shell and core navigation pages:

```powershell
node scripts/attach-metamask-smoke.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --match-url localhost:5173 `
  --goto http://localhost:5173/ `
  --ensure-chain 97 `
  --smoke-connected `
  --wallet-request-timeout-ms 20000 `
  --smoke-timeout-ms 12000 `
  --timeout-ms 8000
```

The script inspects `Orders`, `Insights`, and `Messages` markers and returns JSON. A pass requires a connected wallet, correct chain, and expected page markers.

## Asset Details Navigation Smoke

This checks marketplace card navigation, asset details route, seller profile route, profile reviews route, and contact-seller-to-messages route:

```powershell
node scripts/smoke-asset-modal-navigation.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --match-url localhost:5173 `
  --goto http://localhost:5173/marketplace
```

Use `--asset-title` to target a specific visible listing.

## API Key Smoke

This validates the protected API-key generation path through the app UI and Supabase function route:

```powershell
node scripts/smoke-api-key-generate.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --match-url localhost:5173 `
  --goto http://localhost:5173/ `
  --require-chain 97
```

The script redacts raw generated API keys in its output and can clean up the generated smoke key.

## Protected Mint Smoke

This exercises the minting page, wallet security prompt, MetaMask transaction prompt, and success banner:

```powershell
node scripts/attach-metamask-smoke.mjs `
  --cdp-url http://127.0.0.1:9222 `
  --match-url localhost:5173 `
  --goto http://localhost:5173/ `
  --ensure-chain 97 `
  --smoke-protected-mint `
  --wallet-request-timeout-ms 45000 `
  --smoke-timeout-ms 45000 `
  --timeout-ms 8000
```

Run this only with a test wallet and testnet gas.

## Common Failures

### `Failed to reach Chrome DevTools endpoint`

Chrome is not listening on `9222`, the port is blocked, or Chrome ignored the flag because the chosen profile was already open. Close Chrome and relaunch with a dedicated `--user-data-dir`.

### `No Chrome page target matched localhost:5173`

The app is not open, Vite picked a different port, or the target tab URL does not include the expected match string. Use `--list`, then adjust `--match-url` and `--goto`.

### `missing_provider`

MetaMask is not installed, disabled, locked, or unavailable in the debug profile.

### `wallet_request_pending`

MetaMask already has a pending request. Open the extension and approve or reject it before rerunning.

### Chain switch does not complete

Add BNB Chain Testnet to MetaMask manually or confirm the `wallet_addEthereumChain` prompt. The script uses chain preset `97` / `0x61`.

## Output Handling

Smoke scripts print JSON summaries. Treat secret-like values carefully. The API-key script redacts generated keys, but terminal logs can still contain wallet addresses, target URLs, and environment-derived function base URLs.

