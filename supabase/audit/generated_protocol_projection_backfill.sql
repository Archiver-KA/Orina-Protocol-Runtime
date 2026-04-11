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
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '3', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '50', '50', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"3","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"50","availableAmount":"50","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"1777715594","expiryAtIso":"2026-05-02T09:53:14.000Z","finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '4', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"4","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '5', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '10', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"5","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"10","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '6', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"6","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"0","totalLocked":"1","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '7', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '50', '50', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"7","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"50","availableAmount":"50","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"1777825570","expiryAtIso":"2026-05-03T16:26:10.000Z","finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '8', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', 'active', '1000', '1000', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"8","seller":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"1000","availableAmount":"1000","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"1778149083","expiryAtIso":"2026-05-07T10:18:03.000Z","finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '9', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '999', '1000', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"9","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"1000","availableAmount":"999","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"1778149365","expiryAtIso":"2026-05-07T10:22:45.000Z","finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '10', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"10","seller":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"0","totalLocked":"1","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '11', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', 'active', '10', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"11","seller":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"10","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x72c3477c57097f3791501f3839bb380a019b754f', '12', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '10', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"assetId":"12","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"10","consumedAmount":"0","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
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
insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)
values ('3', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '4', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #4","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"4","assetName":"Asset #4","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1775191881","proposedAtIso":"2026-04-03T04:51:21.000Z","paidAt":"1775191883","paidAtIso":"2026-04-03T04:51:23.000Z","autoReleaseAt":"1775451083","autoReleaseAtIso":"2026-04-06T04:51:23.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1775191881","sellerConfirmedAtIso":"2026-04-03T04:51:21.000Z","buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('4', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '5', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '100000000000000', '100000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #5","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0x2241d3e7c221463fbc90a75cea8232cbfe700b8a","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"5","assetName":"Asset #5","unitId":"0","unitName":"piece","amount":"1","grossPrice":"100000000000000","proposedAt":"1775192833","proposedAtIso":"2026-04-03T05:07:13.000Z","paidAt":"0","paidAtIso":null,"autoReleaseAt":"0","autoReleaseAtIso":null,"estDeliverySeconds":"432000","payDeadline":"1775279236","payDeadlineIso":"2026-04-04T05:07:16.000Z","state":4,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1775192833","sellerConfirmedAtIso":"2026-04-03T05:07:13.000Z","buyerSig1Present":false,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('5', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '6', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'paid', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #6","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"6","assetName":"Asset #6","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1775226744","proposedAtIso":"2026-04-03T14:32:24.000Z","paidAt":"1775228138","paidAtIso":"2026-04-03T14:55:38.000Z","autoReleaseAt":"1775487338","autoReleaseAtIso":"2026-04-06T14:55:38.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":1,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":true,"sellerConfirmedAt":"1775226744","sellerConfirmedAtIso":"2026-04-03T14:32:24.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('6', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '9', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '500000000000000000', '500000000000000000', 'USDT', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0x337610d27c682e347c9cd60bd4b3b107c9d34ddd","paymentTokenSymbol":"USDT","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #9","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0x337610d27c682e347c9cd60bd4b3b107c9d34ddd","paymentTokenSymbol":"USDT","paymentTokenDecimals":18,"assetId":"9","assetName":"Asset #9","unitId":"0","unitName":"piece","amount":"1","grossPrice":"500000000000000000","proposedAt":"1775564070","proposedAtIso":"2026-04-07T12:14:30.000Z","paidAt":"1775564152","paidAtIso":"2026-04-07T12:15:52.000Z","autoReleaseAt":"1776168952","autoReleaseAtIso":"2026-04-14T12:15:52.000Z","estDeliverySeconds":"604800","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"200","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1775564070","sellerConfirmedAtIso":"2026-04-07T12:14:30.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('7', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '10', '0x282be18838d7079c215f49749a9606d77e00888b', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', 'paid', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #10","chainSnapshot":{"buyer":"0x282be18838d7079c215f49749a9606d77e00888b","seller":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","payer":"0x282be18838d7079c215f49749a9606d77e00888b","refundRecipient":"0x282be18838d7079c215f49749a9606d77e00888b","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"10","assetName":"Asset #10","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1775611442","proposedAtIso":"2026-04-08T01:24:02.000Z","paidAt":"1775612973","paidAtIso":"2026-04-08T01:49:33.000Z","autoReleaseAt":"1775872173","autoReleaseAtIso":"2026-04-11T01:49:33.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":1,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":true,"sellerConfirmedAt":"1775611442","sellerConfirmedAtIso":"2026-04-08T01:24:02.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('8', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '11', '0x282be18838d7079c215f49749a9606d77e00888b', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', 'pending_seller_confirm', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #11","chainSnapshot":{"buyer":"0x282be18838d7079c215f49749a9606d77e00888b","seller":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","payer":"0x282be18838d7079c215f49749a9606d77e00888b","refundRecipient":"0x282be18838d7079c215f49749a9606d77e00888b","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"11","assetName":"Asset #11","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1775625934","proposedAtIso":"2026-04-08T05:25:34.000Z","paidAt":"0","paidAtIso":null,"autoReleaseAt":"0","autoReleaseAtIso":null,"estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":0,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":false,"sellerConfirmedAt":"0","sellerConfirmedAtIso":null,"buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('9', 97, '0xbc6f46000b2709714c3908bb6b71bab67a2d1495', '0x72c3477c57097f3791501f3839bb380a019b754f', '12', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'pending_seller_confirm', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #12","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"12","assetName":"Asset #12","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1775626491","proposedAtIso":"2026-04-08T05:34:51.000Z","paidAt":"0","paidAtIso":null,"autoReleaseAt":"0","autoReleaseAtIso":null,"estDeliverySeconds":"1","payDeadline":"0","payDeadlineIso":null,"state":0,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":false,"sellerConfirmedAt":"0","sellerConfirmedAtIso":null,"buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
