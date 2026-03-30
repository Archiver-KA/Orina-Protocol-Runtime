begin;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '0', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"0","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '1', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"1","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"0","totalLocked":"1","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '2', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"2","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)
values ('0', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '0', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #0","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"0","assetName":"Asset #0","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774796560","proposedAtIso":"2026-03-29T15:02:40.000Z","paidAt":"1774796563","paidAtIso":"2026-03-29T15:02:43.000Z","autoReleaseAt":"1775055763","autoReleaseAtIso":"2026-04-01T15:02:43.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1774796560","sellerConfirmedAtIso":"2026-03-29T15:02:40.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
on conflict (chain_id, marketplace_contract, order_uid) do update set
  asset_contract = excluded.asset_contract,
  asset_token_id = excluded.asset_token_id,
  buyer_address = excluded.buyer_address,
  seller_address = excluded.seller_address,
  status = excluded.status,
  amount = excluded.amount,
  price_per_unit = excluded.price_per_unit,
  total_value = excluded.total_value,
  currency_symbol = excluded.currency_symbol,
  metadata = excluded.metadata;
insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)
values ('1', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '1', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'disputed', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #1","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"1","assetName":"Asset #1","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774796616","proposedAtIso":"2026-03-29T15:03:36.000Z","paidAt":"1774796619","paidAtIso":"2026-03-29T15:03:39.000Z","autoReleaseAt":"1774796619","autoReleaseAtIso":"2026-03-29T15:03:39.000Z","estDeliverySeconds":"0","payDeadline":"0","payDeadlineIso":null,"state":2,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":true,"sellerConfirmedAt":"1774796616","sellerConfirmedAtIso":"2026-03-29T15:03:36.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":true,"disputeVerdict":0,"disputeOpenedAt":"1774796623","disputeOpenedAtIso":"2026-03-29T15:03:43.000Z","disputeDeadline":"1776006223","disputeDeadlineIso":"2026-04-12T15:03:43.000Z","disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
on conflict (chain_id, marketplace_contract, order_uid) do update set
  asset_contract = excluded.asset_contract,
  asset_token_id = excluded.asset_token_id,
  buyer_address = excluded.buyer_address,
  seller_address = excluded.seller_address,
  status = excluded.status,
  amount = excluded.amount,
  price_per_unit = excluded.price_per_unit,
  total_value = excluded.total_value,
  currency_symbol = excluded.currency_symbol,
  metadata = excluded.metadata;
insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)
values ('2', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '2', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #2","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"2","assetName":"Asset #2","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774796688","proposedAtIso":"2026-03-29T15:04:48.000Z","paidAt":"1774796690","paidAtIso":"2026-03-29T15:04:50.000Z","autoReleaseAt":"1775055890","autoReleaseAtIso":"2026-04-01T15:04:50.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1774796688","sellerConfirmedAtIso":"2026-03-29T15:04:48.000Z","buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
on conflict (chain_id, marketplace_contract, order_uid) do update set
  asset_contract = excluded.asset_contract,
  asset_token_id = excluded.asset_token_id,
  buyer_address = excluded.buyer_address,
  seller_address = excluded.seller_address,
  status = excluded.status,
  amount = excluded.amount,
  price_per_unit = excluded.price_per_unit,
  total_value = excluded.total_value,
  currency_symbol = excluded.currency_symbol,
  metadata = excluded.metadata;
commit;
