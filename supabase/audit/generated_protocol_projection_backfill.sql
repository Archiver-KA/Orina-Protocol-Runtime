begin;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x5fc61747b359e089e3ced00494f9e71de836b666', '0', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"chainSnapshot":{"assetId":"0","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x5fc61747b359e089e3ced00494f9e71de836b666', '1', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"chainSnapshot":{"assetId":"1","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_assets (chain_id, asset_contract, token_id, owner_address, status, available_amount, total_amount, metadata)
values (97, '0x5fc61747b359e089e3ced00494f9e71de836b666', '2', '0x282be18838d7079c215f49749a9606d77e00888b', 'active', '9', '10', '{"projection_state":"chain_projection","owner_source":"chain_projection","canonical_owner_source":"chain_projection","deploymentScope":{"chainId":97,"assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"chainSnapshot":{"assetId":"2","seller":"0x282be18838d7079c215f49749a9606d77e00888b","unitId":"0","unitName":"piece","unitStep":"1","unitMinAmount":"1","unitActive":true,"unitLocked":false,"totalAmount":"10","availableAmount":"9","consumedAmount":"1","totalLocked":"0","active":true,"expiryAt":"0","expiryAtIso":null,"finalized":false,"assetType":0,"assetTypeLabel":"RWA","mintedTxHash":null,"mintedBlockNumber":null,"mintedBlockTime":null}}'::jsonb)
on conflict (chain_id, asset_contract, token_id) do update set
  owner_address = excluded.owner_address,
  status = excluded.status,
  available_amount = excluded.available_amount,
  total_amount = excluded.total_amount,
  metadata = excluded.metadata;
insert into public.protocol_orders (order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address, status, amount, price_per_unit, total_value, currency_symbol, metadata)
values ('0', 97, '0x026c9e9a5d007ed46df3de900f53c0786ec650c8', '0x5fc61747b359e089e3ced00494f9e71de836b666', '0', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #0","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"0","assetName":"Asset #0","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774666710","proposedAtIso":"2026-03-28T02:58:30.000Z","paidAt":"1774666713","paidAtIso":"2026-03-28T02:58:33.000Z","autoReleaseAt":"1774925913","autoReleaseAtIso":"2026-03-31T02:58:33.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1774666710","sellerConfirmedAtIso":"2026-03-28T02:58:30.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('1', 97, '0x026c9e9a5d007ed46df3de900f53c0786ec650c8', '0x5fc61747b359e089e3ced00494f9e71de836b666', '1', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #1","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"1","assetName":"Asset #1","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774666877","proposedAtIso":"2026-03-28T03:01:17.000Z","paidAt":"1774666880","paidAtIso":"2026-03-28T03:01:20.000Z","autoReleaseAt":"1774926080","autoReleaseAtIso":"2026-03-31T03:01:20.000Z","estDeliverySeconds":"259200","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1774666877","sellerConfirmedAtIso":"2026-03-28T03:01:17.000Z","buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false,"disputedActive":false,"disputeVerdict":0,"disputeOpenedAt":"0","disputeOpenedAtIso":null,"disputeDeadline":"0","disputeDeadlineIso":null,"disputeExtended":false,"disputeBuyerShareBps":"0","disputeSellerShareBps":"0"}}'::jsonb)
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
values ('2', 97, '0x026c9e9a5d007ed46df3de900f53c0786ec650c8', '0x5fc61747b359e089e3ced00494f9e71de836b666', '2', '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14', '0x282be18838d7079c215f49749a9606d77e00888b', 'finalized', '1', '1000000000000000', '1000000000000000', 'WBNB', '{"projection_state":"chain_projection","status_source":"chain_projection","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","assetContract":"0x5fc61747b359e089e3ced00494f9e71de836b666"},"paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"unitId":"0","unitName":"piece","assetName":"Asset #2","chainSnapshot":{"buyer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","seller":"0x282be18838d7079c215f49749a9606d77e00888b","payer":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","refundRecipient":"0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14","paymentToken":"0xae13d989dac2f0debff460ac112a837c89baa7cd","paymentTokenSymbol":"WBNB","paymentTokenDecimals":18,"assetId":"2","assetName":"Asset #2","unitId":"0","unitName":"piece","amount":"1","grossPrice":"1000000000000000","proposedAt":"1774667133","proposedAtIso":"2026-03-28T03:05:33.000Z","paidAt":"1774667137","paidAtIso":"2026-03-28T03:05:37.000Z","autoReleaseAt":"1774667137","autoReleaseAtIso":"2026-03-28T03:05:37.000Z","estDeliverySeconds":"0","payDeadline":"0","payDeadlineIso":null,"state":3,"settlementType":2,"split":{"buyerShareBps":"2500","sellerShareBps":"7500"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"sellerConfirmedAt":"1774667133","sellerConfirmedAtIso":"2026-03-28T03:05:33.000Z","buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true,"disputedActive":false,"disputeVerdict":3,"disputeOpenedAt":"1774667138","disputeOpenedAtIso":"2026-03-28T03:05:38.000Z","disputeDeadline":"1775876738","disputeDeadlineIso":"2026-04-11T03:05:38.000Z","disputeExtended":false,"disputeBuyerShareBps":"2500","disputeSellerShareBps":"7500"}}'::jsonb)
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
