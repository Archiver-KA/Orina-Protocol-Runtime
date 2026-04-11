# Runtime Repo Split Manifest

Snapshot basis:

- workspace: `c:\ORINA\ATPProtocol2\ATP2`
- baseline commit for clean repo extraction: `c4e24b4` (`HEAD` on `master` when this manifest was produced)
- this manifest covers dirty worktree deltas only
- current runtime target in working tree: `orina-ai-m2m-v2`

Decision buckets:

- `KEEP NOW`: carry into the first clean repo snapshot as-is
- `MOVE / RENAME`: preserve content, but change location so the clean repo does not keep old root artifact paths
- `SPLIT BEFORE CARRY`: file has mixed staged/unstaged history or historical-migration risk; split hunks before carrying
- `DROP / PARK`: exclude from the first clean repo snapshot

## KEEP NOW

These files are part of the runtime/frontend/Supabase closure and should move into the first clean repo snapshot without waiting on non-runtime docs or local artifacts.

### Root / CI / release gate

- `.env.example`
- `.github/workflows/protocol-release-gate.yml`
- `deno.lock`
- `index.html`
- `package-lock.json`
- `package.json`
- `vite.config.ts`

### Public assets / SEO / verification scripts

- `public/favicon.svg`
- `public/orina-social-card.svg`
- `public/robots.txt`
- `public/site.webmanifest`
- `public/sitemap.xml`
- `scripts/attach-metamask-smoke.mjs`
- `scripts/audit-supabase-security-definer.mjs`
- `scripts/check-effective-viewer-surfaces.mjs`
- `scripts/check-protocol-runtime-surface.mjs`
- `scripts/prerender-public-routes.mjs`
- `scripts/smoke-api-key-generate.mjs`

### Docs kept with runtime repo

- `docs/order-state-semantics.md`
- `docs/runtime-repo-split-manifest.md`
- `docs/spec/20-seo-and-system-completion-roadmap.md`
- `docs/supabase-migration-drift-reconciliation.md`

### Runtime data / shared utils

- `data/taxonomy/orina_ai_taxonomy_v1.json`
- `utils/runtimeConfig.ts`
- `utils/supabase/functions.ts`

### Frontend runtime closure

- `src/app/App.tsx`
- `src/app/access/access-policy.ts`
- `src/app/access/access-policy.test.ts`
- `src/app/components/agent-settings.tsx`
- `src/app/components/ai-agent-settings.tsx`
- `src/app/components/ai-m2m-wallet-settings.tsx`
- `src/app/components/ai/ai-sidebar.tsx`
- `src/app/components/ai/borderless-textarea.tsx`
- `src/app/components/analytics/user-insights-calendar.tsx`
- `src/app/components/api-keys-settings.tsx`
- `src/app/components/asset-details-modal.tsx`
- `src/app/components/asset-details/canonical-asset-details-route.tsx`
- `src/app/components/assets-right-sidebar.tsx`
- `src/app/components/assets.tsx`
- `src/app/components/cancel-order-modal.tsx`
- `src/app/components/cards/my-asset-cards.tsx`
- `src/app/components/collection-card.tsx`
- `src/app/components/collections/add-asset-to-collection-modal.tsx`
- `src/app/components/collections/collection-details-modal.tsx`
- `src/app/components/collections/collection-details-route.tsx`
- `src/app/components/collections/collection-editor-modal.tsx`
- `src/app/components/collections/collections-grid-panel.tsx`
- `src/app/components/command-palette/command-palette.tsx`
- `src/app/components/community-right-sidebar.tsx`
- `src/app/components/community.tsx`
- `src/app/components/community/create-post-modal.tsx`
- `src/app/components/community/enhanced-community.tsx`
- `src/app/components/confirm-delivery-modal.tsx`
- `src/app/components/confirm-release-modal.tsx`
- `src/app/components/custom-dropdown.tsx`
- `src/app/components/dispute-resolution-modal.tsx`
- `src/app/components/duration-picker.tsx`
- `src/app/components/favorites/favorites-following-page.tsx`
- `src/app/components/history-right-sidebar.tsx`
- `src/app/components/history.tsx`
- `src/app/components/image-upload.tsx`
- `src/app/components/left-sidebar.tsx`
- `src/app/components/list-for-sale-modal.tsx`
- `src/app/components/main-content.tsx`
- `src/app/components/market-insights.tsx`
- `src/app/components/market-volume-chart.tsx`
- `src/app/components/marketplace.tsx`
- `src/app/components/marketplace/progressive-marketplace-map-surface.tsx`
- `src/app/components/marketplace/realistic-world-map.tsx`
- `src/app/components/messages.tsx`
- `src/app/components/minting-delivery-section.tsx`
- `src/app/components/minting-drafts-list.tsx`
- `src/app/components/minting-right-sidebar.tsx`
- `src/app/components/minting.tsx`
- `src/app/components/navbar.tsx`
- `src/app/components/network-switcher.tsx`
- `src/app/components/new-conversation-modal.tsx`
- `src/app/components/nft-buy-direct-sign-modal.tsx`
- `src/app/components/notifications/notification-badge.tsx`
- `src/app/components/notifications/notification-center.tsx`
- `src/app/components/notifications/notification-item.tsx`
- `src/app/components/open-dispute-modal.tsx`
- `src/app/components/order-details-modal.tsx`
- `src/app/components/pill-segmented-toggle.tsx`
- `src/app/components/profile-search-card.tsx`
- `src/app/components/profile/edit-profile-modal.tsx`
- `src/app/components/profile/edit-profile-modal.utils.test.ts`
- `src/app/components/profile/edit-profile-modal.utils.ts`
- `src/app/components/profile/enhanced-profile.tsx`
- `src/app/components/profile/profile-follow-button.tsx`
- `src/app/components/public/public-navbar.tsx`
- `src/app/components/public/public-shell.tsx`
- `src/app/components/public-home-page.tsx`
- `src/app/components/receipt-detail-modal.tsx`
- `src/app/components/reputation/reputation-display.tsx`
- `src/app/components/reputation/reputation-modal.tsx`
- `src/app/components/reviews/rating-breakdown.tsx`
- `src/app/components/reviews/review-card.tsx`
- `src/app/components/reviews/reviews-section.tsx`
- `src/app/components/reviews/star-rating.tsx`
- `src/app/components/reviews/write-review-modal.tsx`
- `src/app/components/right-sidebar.tsx`
- `src/app/components/runtime-status-panel-router.tsx`
- `src/app/components/rwa-buy-order-sign-modal.tsx`
- `src/app/components/search-result-card.tsx`
- `src/app/components/search/filter-tags.tsx`
- `src/app/components/search/price-range-slider.tsx`
- `src/app/components/search/search-page.tsx`
- `src/app/components/search/search-page.utils.test.ts`
- `src/app/components/search/search-page.utils.ts`
- `src/app/components/seller-ai-minting-settings.tsx`
- `src/app/components/settings.tsx`
- `src/app/components/settings/delivery-address-block.tsx`
- `src/app/components/seo/app-seo.tsx`
- `src/app/components/standard-toggle.tsx`
- `src/app/components/transfer-modal.tsx`
- `src/app/components/ui/empty-state-card.tsx`
- `src/app/components/ui/hover-card.tsx`
- `src/app/components/ui/map.tsx`
- `src/app/components/ui/protocol-chain-banner.tsx`
- `src/app/components/ui/runtime-error-boundary.tsx`
- `src/app/components/ui/sonner.tsx`
- `src/app/components/ui/studio-action-button.tsx`
- `src/app/components/ui/studio-data-table.tsx`
- `src/app/components/ui/studio-form-fields.tsx`
- `src/app/components/ui/studio-list-parts.tsx`
- `src/app/components/ui/studio-modal.tsx`
- `src/app/components/ui/studio-notice-panel.tsx`
- `src/app/components/ui/studio-page-header.tsx`
- `src/app/components/ui/studio-panel.tsx`
- `src/app/components/ui/studio-pill-group.tsx`
- `src/app/components/ui/studio-sidebar-parts.tsx`
- `src/app/components/ui/studio-stats-card.tsx`
- `src/app/components/ui/studio-status-badge.tsx`
- `src/app/components/ui/studio-tx-state-panel.tsx`
- `src/app/components/wallet-connect-button.tsx`
- `src/app/components/wallet/connect-wallet-modal.tsx`
- `src/app/components/wallet/security-check-modal.tsx`
- `src/app/components/wallet/signature-request-modal.tsx`
- `src/app/components/wallet/transaction-processing-modal.tsx`
- `src/app/components/wallet/transaction-success-modal.tsx`
- `src/app/components/warehouse-inventory-list.tsx`
- `src/app/contexts/ThemeContext.tsx`
- `src/app/runtime/runtime-app-types.ts`
- `src/app/runtime/runtime-app.tsx`
- `src/app/types/ai-agent.ts`
- `src/app/types/api-key.ts`
- `src/app/types/asset.ts`
- `src/config/eip712.ts`
- `src/config/m2m.ts`
- `src/contexts/NotificationContext.tsx`
- `src/contexts/ProtocolNetworkContext.tsx`
- `src/contexts/UserContext.tsx`
- `src/contexts/WalletModalContext.tsx`
- `src/hooks/useAIM2M.ts`
- `src/hooks/useAnalytics.ts`
- `src/hooks/useEffectiveViewer.ts`
- `src/hooks/useMarketplace.ts`
- `src/hooks/useProtocolAnalytics.ts`
- `src/hooks/useProtocolChain.ts`
- `src/hooks/useProtocolDataNetwork.ts`
- `src/hooks/useRequireWalletAction.ts`
- `src/hooks/useRuntimeProbe.ts`
- `src/hooks/useWalletSecurityPrompt.ts`
- `src/main.tsx`
- `src/providers/Web3Provider.tsx`
- `src/styles/index.css`
- `src/styles/theme.css`
- `src/types/order.ts`
- `src/utils/aiAgentClient.ts`
- `src/utils/aiM2MWalletClient.ts`
- `src/utils/aiSearchUtils.ts`
- `src/utils/apiKeysClient.ts`
- `src/utils/appNavigation.test.ts`
- `src/utils/appNavigation.ts`
- `src/utils/appRoutes.test.ts`
- `src/utils/appRoutes.ts`
- `src/utils/assetMetadataSync.ts`
- `src/utils/assetsPortfolio.ts`
- `src/utils/communityUtils.ts`
- `src/utils/deliveryAddressUtils.test.ts`
- `src/utils/deliveryAddressUtils.ts`
- `src/utils/disputeCase.ts`
- `src/utils/ipfsUploadAuth.ts`
- `src/utils/marketplaceAsset.ts`
- `src/utils/marketplaceCatalog.ts`
- `src/utils/marketplaceNetwork.ts`
- `src/utils/messagesClient.ts`
- `src/utils/orderLifecycle.ts`
- `src/utils/orderProjectionSync.ts`
- `src/utils/orderSemantics.test.ts`
- `src/utils/orderSemantics.ts`
- `src/utils/profileOverview.ts`
- `src/utils/profileReputationSync.ts`
- `src/utils/protocolNetwork.ts`
- `src/utils/reputationUtils.ts`
- `src/utils/runtimeMintedAssets.ts`
- `src/utils/runtimeOrders.test.ts`
- `src/utils/runtimeOrders.ts`
- `src/utils/runtimeReceipts.ts`
- `src/utils/searchUtils.ts`
- `src/utils/seller-ai-minting-utils.ts`
- `src/utils/sellerDirectory.ts`
- `src/utils/supabaseAuthClaimBridge.ts`
- `src/utils/supabaseRest.ts`
- `src/utils/userSettingsUtils.ts`
- `src/utils/walletAuthSession.test.ts`
- `src/utils/walletAuthSession.ts`
- `src/utils/warehouseInventory.ts`

### Supabase runtime code / migrations / reference inputs

- `supabase/audit/README.md`
- `supabase/audit/audit_artifact_paths.cjs`
- `supabase/audit/backfill_runtime_minted_projection_repair.cjs`
- `supabase/audit/batch_c2_asset_metadata_seed_smoke_probe.cjs`
- `supabase/audit/batch_c4_notifications_event_matrix_auto_probe.cjs`
- `supabase/audit/batch_h3_api_smoke_claim_bridge_rest_minimal.cjs`
- `supabase/audit/bridge_auth_client.cjs`
- `supabase/audit/generated_protocol_projection_backfill.sql`
- `supabase/audit/import_protocol_runtime_smoke_records.cjs`
- `supabase/audit/inspect_remote_schema.cjs`
- `supabase/audit/inspect_supabase_rest_anon.cjs`
- `supabase/audit/run_c4_probe_from_env.cjs`
- `supabase/audit/run_h3_smoke_from_env.cjs`
- `supabase/audit/run_import_smoke_record.cjs`
- `supabase/audit/run_review_smoke_from_env.cjs`
- `supabase/audit/run_runtime_projection_repair_from_env.cjs`
- `supabase/audit/seed_community_posts_from_smoke_wallet.cjs`
- `supabase/audit/smoke_asset_metadata_seed_direct.cjs`
- `supabase/audit/smoke_ai_m2m_flow.cjs`
- `supabase/audit/smoke_ai_mint_b2b_flow.cjs`
- `supabase/audit/smoke_messaging_rls_direct.cjs`
- `supabase/audit/smoke_receipt_sync_wallet_direct.cjs`
- `supabase/audit/smoke_review_end_to_end.cjs`
- `supabase/audit/smoke_seller_minting_direct.cjs`
- `supabase/audit/smoke_wallet_claim_security.cjs`
- `supabase/audit/test_h1_claim_bridge_http.cjs`
- `supabase/audit/verify_batch1_expected_tables_from_index_stats.cjs`
- `supabase/audit/verify_batch1_expected_tables_from_table_stats.cjs`
- `supabase/audit/reference/foundry/foundry_src_signatures_summary.json`
- `supabase/functions/orina-ai-m2m-v2/index.ts`
- `supabase/functions/orina-auth-bridge-v1/index.ts`
- `supabase/functions/orina-receipt-sync-v1/index.ts`
- `supabase/functions/orina-seller-minting-v1/index.ts`
- `supabase/functions/server/api-keys-handler.ts`
- `supabase/functions/server/edge-app.ts`
- `supabase/functions/server/index.tsx`
- `supabase/functions/server/orina-ai-engine-v2.tsx`
- `supabase/functions/server/sync-receipt-nfts.ts`
- `supabase/functions/server/types.ts`
- `supabase/functions/server/wallet-auth-claim-bridge.tsx`
- `supabase/audit/probe_ai_m2m_runtime.cjs`
- `supabase/audit/protocol_runtime_config.cjs`
- `supabase/migrations/000053_rate_limit_atomic_and_protocol_receipts.sql`
- `supabase/migrations/000054_m2m_wallet_relational_tables.sql`
- `supabase/migrations/000055_rls_security_hardening.sql`
- `supabase/migrations/000056_security_audit_log.sql`
- `supabase/migrations/000057_api_keys_handler_support.sql`
- `supabase/migrations/000058_ai_threads_rls_and_rpc.sql`
- `supabase/migrations/000059_marketplace_listing_stats_rpc.sql`
- `supabase/migrations/000060_drop_seller_assets_bucket.sql`
- `supabase/migrations/000061_assets_catalog_metadata_normalization.sql`
- `supabase/migrations/000062_c18_profile_reputation_summary_precision_fix.sql`
- `supabase/migrations/000063_harden_helper_function_grants.sql`
- `supabase/migrations/000064_rls_policy_cleanup_and_public_rpc_audit.sql`

## MOVE / RENAME

These paths should be preserved, but only under archive/reference locations so the clean repo does not keep stale root artifact paths.

- `supabase/audit/azimhqpsjgxbmjlxaghp_anon_rest_audit.json` -> `supabase/audit/archive/json/azimhqpsjgxbmjlxaghp_anon_rest_audit.json`
- `supabase/audit/batch1_expected_tables_from_index_stats.json` -> `supabase/audit/reference/batch1/batch1_expected_tables_from_index_stats.json`
- `supabase/audit/batch1_expected_tables_from_table_stats.json` -> `supabase/audit/reference/batch1/batch1_expected_tables_from_table_stats.json`
- `supabase/audit/batch1_index_stats.err` -> `supabase/audit/reference/batch1/batch1_index_stats.err`
- `supabase/audit/batch1_index_stats.txt` -> `supabase/audit/reference/batch1/batch1_index_stats.txt`
- `supabase/audit/batch1_table_stats.err` -> `supabase/audit/reference/batch1/batch1_table_stats.err`
- `supabase/audit/batch1_table_stats.json` -> `supabase/audit/reference/batch1/batch1_table_stats.json`

## SPLIT BEFORE CARRY

These files are unsafe to move wholesale because they either have mixed staged/unstaged layers or mutate historical migrations.

- `docs/README.md`
- `docs/spec/11-ai-m2m-runtime-enablement.md`
- `docs/spec/12-ai-m2m-supabase-deploy-runtime-checklist.md`
- `docs/spec/19-supabase-split-function-runbook.md`
- `src/app/components/orders.tsx`
- `src/app/components/seller-asset-management-modal.tsx`
- `src/hooks/useUserOrders.ts`
- `src/utils/orderSorting.ts`
- `supabase/functions/server/seller-ai-minting-handler.ts`
- `supabase/migrations/000037_ai_agent_schema_fixes.sql`

## DROP / PARK

These files should stay out of the first clean repo snapshot.

### Root scratch / accidental local files

- `'`
- `0`
- `s`
- `tmp-edit.js`
- `tmp_collection_current.tsx`
- `tmp_collection_old.tsx`
- `tmp_py_test.py`
- `{`

### Docs to park outside the first clean runtime cut

- `docs/spec/05-integrations-settings-and-tools.md`
- `docs/spec/15-local-api-audit-and-server-migration-plan.md`
- `docs/spec/17-ai-store-advisor-architecture.md`
- `docs/spec/18-api-credential-ai-agent-separation.md`

### Prompt / agent docs not needed for the clean runtime repo cut

- `orina_agent/Example_agent.md`
- `orina_agent/systeam_product_sourcing.md`
- `orina_agent/system_ARBITRATION.md`
- `orina_agent/system_prompt_Store_Advisor.md`
- `orina_agent/system_seller_Adviser.md`

### Legacy public landing bundle to remove

- `public/orina-home/css/normalize.css`
- `public/orina-home/css/orina-protocol-app.webflow.css`
- `public/orina-home/css/webflow.css`
- `public/orina-home/images/64ccf7f739f4636b5ac44e96_Ethereum-2.svg`
- `public/orina-home/images/695a703e088eb0f2d396a145_64ccf7f739f4636b5ac44e96_Ethereum.svg`
- `public/orina-home/images/695bba23a59fc3a75f8cfd7f_64ccf7f739f4636b5ac44e97_Terra.svg`
- `public/orina-home/images/695ee9792e532b8abc74c965_64ccf7f739f4636b5ac44e97_Terra-1.svg`
- `public/orina-home/images/695ee9797aad1487e9971355_icon_planet_forceforcefield-1.svg`
- `public/orina-home/images/Group-1168-1-p-130x130q80.png`
- `public/orina-home/images/Group-1168-1-p-500.png`
- `public/orina-home/images/Group-1168-1-p-800.png`
- `public/orina-home/images/Group-1168-1.png`
- `public/orina-home/images/favicon.ico`
- `public/orina-home/images/orina-wordmark.svg`
- `public/orina-home/images/webclip.png`
- `public/orina-home/index.html`
- `public/orina-home/js/webflow.js`

### Frontend file to drop

- `src/styles/fonts.css`

### Generated Supabase audit outputs to exclude

- `supabase/audit/archive/json/batch_c2_asset_metadata_seed_smoke_probe_2026-02-25T12-19-19.json`
- `supabase/audit/archive/json/batch_c2_asset_metadata_seed_smoke_probe_2026-02-25T12-20-35.json`
- `supabase/audit/archive/json/batch_c2_asset_metadata_seed_smoke_probe_2026-02-25T12-21-49.json`
- `supabase/audit/archive/json/batch_c2_asset_metadata_seed_smoke_probe_2026-02-25T12-29-09.json`
- `supabase/audit/archive/json/batch_c4_notifications_event_matrix_auto_probe_2026-02-25T13-52-04-160Z.json`
- `supabase/audit/archive/json/batch_c4_notifications_event_matrix_auto_probe_2026-02-25T13-53-01-014Z.json`
- `supabase/audit/archive/json/batch_c4_notifications_event_matrix_auto_probe_2026-02-25T13-53-52-937Z.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_importfix.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_jwtsecret.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_jwtsecret_from_keymd.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25_after_slugfix.json`
- `supabase/audit/archive/json/batch_h1_make_server_b0d68fc8_probe_2026-02-25_noverify.json`
- `supabase/audit/archive/json/batch_h1_server_function_probe_2026-02-25.json`
- `supabase/audit/archive/json/batch_h1_server_probe_2026-02-25_after_importfix.json`
- `supabase/audit/archive/json/batch_h3_api_smoke_claim_bridge_rest_minimal_2026-02-25.json`
- `supabase/audit/archive/json/batch_h3_api_smoke_claim_bridge_rest_minimal_2026-02-25_retry_after_keymd.json`
- `supabase/audit/archive/json/post_cutover_order_dispute_audit.latest.json`
- `supabase/audit/archive/json/smoke_ai_m2m_flow_2026-03-27T22-12-25.json`
- `supabase/audit/archive/json/smoke_ai_m2m_flow_2026-03-28T01-47-50.json`
- `supabase/audit/archive/json/smoke_ai_m2m_flow_2026-03-28T02-22-44.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T08-46-12.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T08-51-07.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T08-53-33.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T08-58-01.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-00-00.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-01-37.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-12-58.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-20-01.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-24-00.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-34-19.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-35-07.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-35-50.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-42-09.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-44-43.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-51-18.json`
- `supabase/audit/archive/json/smoke_ai_mint_b2b_2026-04-02T09-53-30.json`
- `supabase/audit/archive/json/vcixsdudkizgfikhmfuv_anon_rest_audit.json`
- `supabase/audit/artifacts/batch_c4_notifications_event_matrix_auto_probe_2026-04-03T14-28-37-416Z.json`
- `supabase/audit/artifacts/batch_c4_notifications_event_matrix_auto_probe_2026-04-03T14-30-18-162Z.json`
- `supabase/audit/artifacts/batch_c4_notifications_event_matrix_auto_probe_2026-04-03T14-31-27-256Z.json`
- `supabase/audit/artifacts/smoke_ai_mint_b2b_2026-04-03T16-26-26.json`
- `supabase/audit/artifacts/smoke_asset_metadata_seed_direct_2026-04-05T01-56-37.json`
- `supabase/audit/artifacts/smoke_receipt_sync_wallet_direct_2026-04-05T02-08-06.json`
- `supabase/audit/artifacts/smoke_seller_minting_direct_2026-04-05T01-55-36.json`

## Extraction order

1. Start the clean repo from `c4e24b4`, not from a raw copy of this dirty worktree.
2. Carry `KEEP NOW`.
3. Apply `MOVE / RENAME`.
4. Re-open each `SPLIT BEFORE CARRY` file and split hunks intentionally.
5. Leave `DROP / PARK` out of the first clean commit.
