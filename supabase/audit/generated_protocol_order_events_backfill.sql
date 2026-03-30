begin;
insert into public.protocol_orders (
  order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address,
  status, amount, price_per_unit, total_value, currency_symbol, metadata
) values (
  '0',
  97,
  '0xbc6f46000b2709714c3908bb6b71bab67a2d1495',
  '0x72c3477c57097f3791501f3839bb380a019b754f',
  '0',
  '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14',
  '0x282be18838d7079c215f49749a9606d77e00888b',
  'finalized',
  '1',
  '1000000000000000',
  '1000000000000000',
  '0xae13d989dac2f0debff460ac112a837c89baa7cd',
  '{"projection_state":"chain_backfill","status_source":"chain_backfill","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"proposedAt":"1774796560","paidAt":"1774796563","autoReleaseAt":"1775055763","estDeliverySeconds":"259200","payDeadline":"0","state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true}}'::jsonb
)
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
insert into public.protocol_orders (
  order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address,
  status, amount, price_per_unit, total_value, currency_symbol, metadata
) values (
  '1',
  97,
  '0xbc6f46000b2709714c3908bb6b71bab67a2d1495',
  '0x72c3477c57097f3791501f3839bb380a019b754f',
  '1',
  '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14',
  '0x282be18838d7079c215f49749a9606d77e00888b',
  'disputed',
  '1',
  '1000000000000000',
  '1000000000000000',
  '0xae13d989dac2f0debff460ac112a837c89baa7cd',
  '{"projection_state":"chain_backfill","status_source":"chain_backfill","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"proposedAt":"1774796616","paidAt":"1774796619","autoReleaseAt":"1774796619","estDeliverySeconds":"0","payDeadline":"0","state":2,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":false,"sellerConfirmed":true,"buyerSig1Present":true,"sellerSigPresent":true,"buyerSig2Present":true}}'::jsonb
)
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
insert into public.protocol_orders (
  order_uid, chain_id, marketplace_contract, asset_contract, asset_token_id, buyer_address, seller_address,
  status, amount, price_per_unit, total_value, currency_symbol, metadata
) values (
  '2',
  97,
  '0xbc6f46000b2709714c3908bb6b71bab67a2d1495',
  '0x72c3477c57097f3791501f3839bb380a019b754f',
  '2',
  '0xb43f3f31fae56c4e8c0be36ec6f84dd5b1571c14',
  '0x282be18838d7079c215f49749a9606d77e00888b',
  'finalized',
  '1',
  '1000000000000000',
  '1000000000000000',
  '0xae13d989dac2f0debff460ac112a837c89baa7cd',
  '{"projection_state":"chain_backfill","status_source":"chain_backfill","canonical_status_source":"chain_projection","deploymentScope":{"chainId":97,"marketplaceContract":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","assetContract":"0x72c3477c57097f3791501f3839bb380a019b754f"},"chainSnapshot":{"proposedAt":"1774796688","paidAt":"1774796690","autoReleaseAt":"1775055890","estDeliverySeconds":"259200","payDeadline":"0","state":3,"settlementType":0,"split":{"buyerShareBps":"0","sellerShareBps":"0"},"platformFeeBpsSnapshot":"100","daoFeeBpsSnapshot":"50","burnFeeBpsSnapshot":"50","referralFeeBpsSnapshot":"0","finalized":true,"sellerConfirmed":true,"buyerSig1Present":true,"sellerSigPresent":false,"buyerSig2Present":false}}'::jsonb
)
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
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'BuyerSigned1',
  97,
  '0x3996918b99625fa4b21c8334a6b2d3ccb71ff5aba75440f4cc7ab633c3f67e45',
  6,
  98570308,
  '2026-03-29T15:02:40.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","signature":"0x4899bda890dad1a036d8b2694e3a97b5e48bad515d620f66de2736db027744c359d821b8d923a228eebfec7eb234774017d03f7a07c61a02786700cd958e3ac41c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'OrderProposed',
  97,
  '0x3996918b99625fa4b21c8334a6b2d3ccb71ff5aba75440f4cc7ab633c3f67e45',
  7,
  98570308,
  '2026-03-29T15:02:40.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'SellerSigned',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  6,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","signature":"0xa6ae455dfe1dcf5cb5e6043a4f6f4da0df56fd39b3c32976969fea6478496d7252fead6730bd13d75508ec32d03aa253ac2a4e3dc5e8e04f3eca90e213e051d01b"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'SellerConfirmed',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  7,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'DeliveryTimeSet',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  8,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","estDeliverySeconds":"259200"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'BuyerSigned2',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  10,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","signature":"0x4899bda890dad1a036d8b2694e3a97b5e48bad515d620f66de2736db027744c359d821b8d923a228eebfec7eb234774017d03f7a07c61a02786700cd958e3ac41c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'DeliveryTimeAccepted',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  11,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'OrderPaid',
  97,
  '0xe01528fb831028118baf777d86959640620ac1f34d520e08f8f7cb2a7e1fe281',
  12,
  98570313,
  '2026-03-29T15:02:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '0'),
  'OrderFinalized',
  97,
  '0xcd09f5f12a0a5cda06b36691d6aff66fdffc01a3d53c32c303074b78faf38d12',
  13,
  98570317,
  '2026-03-29T15:02:44.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"0","args":{"orderId":"0","settlement":0}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'BuyerSigned1',
  97,
  '0x23c791d069710dd906a1cc8877b21655eba1756fb100dc3e38d4d15add4cac94',
  7,
  98570432,
  '2026-03-29T15:03:36.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","signature":"0x33e90a9e428580b106e51e4f95fb9b6d01e792d650cb5445035eab73bd68d025308175a77eb71236c9f8552170aa7a563014d2b10261f4a8b21e608cabfb4e5d1c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'OrderProposed',
  97,
  '0x23c791d069710dd906a1cc8877b21655eba1756fb100dc3e38d4d15add4cac94',
  8,
  98570432,
  '2026-03-29T15:03:36.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'SellerSigned',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  3,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","signature":"0xe0249c630db733071b1d7272148f6d423fcdf19451f9b8a95241ee0e7979d5013ae97207538652bba35ee80d01981ffef6cf24f78d0c99d3aac14f5f3975112a1c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'SellerConfirmed',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  4,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'DeliveryTimeSet',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  5,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","estDeliverySeconds":"0"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'BuyerSigned2',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  7,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","signature":"0x33e90a9e428580b106e51e4f95fb9b6d01e792d650cb5445035eab73bd68d025308175a77eb71236c9f8552170aa7a563014d2b10261f4a8b21e608cabfb4e5d1c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'DeliveryTimeAccepted',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  8,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'OrderPaid',
  97,
  '0x26c80cb35c20f3b76754763c933f40aabcb5b0d8fb3f66ae25ff8a981e2cd30a',
  9,
  98570438,
  '2026-03-29T15:03:39.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '1'),
  'DisputeOpened',
  97,
  '0x02a44651ef61939d4adbdfc0d32780d2776865e893908810bf43c464bfc6b882',
  26,
  98570448,
  '2026-03-29T15:03:43.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"1","args":{"orderId":"1","opener":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'BuyerSigned1',
  97,
  '0x88fa9993ac85aba50eb110c9f7caf8b0c31894c6e6dee69659117192b13a041f',
  4,
  98570592,
  '2026-03-29T15:04:48.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2","signature":"0x3a648779da7e26462aaaf56ec705553a4366e3e918d1f2af1857394923866fd01f4aa638a3c744a2bf0476893e33ed2098bfa95a51e8d603eedbde77d9d6d0df1c"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'OrderProposed',
  97,
  '0x88fa9993ac85aba50eb110c9f7caf8b0c31894c6e6dee69659117192b13a041f',
  5,
  98570592,
  '2026-03-29T15:04:48.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'SellerConfirmed',
  97,
  '0x827ce439d106fde8f42a7f461d33974f6a501d904c5954241edf6fc60e21ae58',
  6,
  98570597,
  '2026-03-29T15:04:50.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'DeliveryTimeSet',
  97,
  '0x827ce439d106fde8f42a7f461d33974f6a501d904c5954241edf6fc60e21ae58',
  7,
  98570597,
  '2026-03-29T15:04:50.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2","estDeliverySeconds":"259200"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'DeliveryTimeAccepted',
  97,
  '0x827ce439d106fde8f42a7f461d33974f6a501d904c5954241edf6fc60e21ae58',
  9,
  98570597,
  '2026-03-29T15:04:50.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'OrderPaid',
  97,
  '0x827ce439d106fde8f42a7f461d33974f6a501d904c5954241edf6fc60e21ae58',
  10,
  98570597,
  '2026-03-29T15:04:50.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  (select id from public.protocol_orders where chain_id = 97 and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495' and order_uid = '2'),
  'OrderFinalized',
  97,
  '0x46ba60c21376bea42762ad1d449a33d06630920c9c2ac48795ded820ff78dfa7',
  7,
  98570602,
  '2026-03-29T15:04:53.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0xbc6f46000b2709714c3908bb6b71bab67a2d1495","orderUid":"2","args":{"orderId":"2","settlement":0}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
commit;
