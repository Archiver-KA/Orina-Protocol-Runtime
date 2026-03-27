begin;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  'b1678a8c-8e03-47c1-bfac-4368d2f9ca0c',
  'DisputeOpened',
  97,
  '0xe1ab8d868993e50846b656913fdf9d181a61f8a0299d976e2c7f0cf61c8c0e2d',
  16,
  96697164,
  '2026-03-19T20:52:52.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"3","args":{"orderId":"3","opener":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14"}}'::jsonb
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
  'b1678a8c-8e03-47c1-bfac-4368d2f9ca0c',
  'OrderFinalized',
  97,
  '0xdd5bcac2d44c4796b4643e7f398fd804adb77ac3e215464d045c1bd6d5553e77',
  49,
  96697224,
  '2026-03-19T20:53:19.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"3","args":{"orderId":"3","settlement":2}}'::jsonb
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
  'b1678a8c-8e03-47c1-bfac-4368d2f9ca0c',
  'DisputeResolvedByAgreement',
  97,
  '0xdd5bcac2d44c4796b4643e7f398fd804adb77ac3e215464d045c1bd6d5553e77',
  52,
  96697224,
  '2026-03-19T20:53:19.000Z'::timestamptz,
  '{"sourceContract":"dispute_manager","contractAddress":"0x33dceb1e8aec7fe69d8a1390de0cc0e879035949","orderUid":"3","args":{"orderId":"3","verdict":3,"buyerShareBps":"2500","sellerShareBps":"7500","signatureCount":"2"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'BuyerSigned1',
  97,
  '0x3a0d4b6add72707951bcd7d91af6103f20a90120fe72b4f5a522894708b76cae',
  19,
  96697332,
  '2026-03-19T20:54:07.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","signature":"0xff61299dd8763d402840cf9a0b0bcd6e65a0e83e078debdc99cc01479a79df7337c04a15df828f06cf79557603b0869864e348dfbc3a764790178953776c93e21c"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'OrderProposed',
  97,
  '0x3a0d4b6add72707951bcd7d91af6103f20a90120fe72b4f5a522894708b76cae',
  20,
  96697332,
  '2026-03-19T20:54:07.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'SellerSigned',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  0,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","signature":"0xf405792717dbfdbdbd3b6e87ecd91e67290c4e816827ee748016e1093ebf0a37582d2a979ab3a7314c5b124b48d48c0016e923a1cedf4663b7b2d74be3f99a191c"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'SellerConfirmed',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  1,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'DeliveryTimeSet',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  2,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","estDeliverySeconds":"60"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'BuyerSigned2',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  4,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","signature":"0xff61299dd8763d402840cf9a0b0bcd6e65a0e83e078debdc99cc01479a79df7337c04a15df828f06cf79557603b0869864e348dfbc3a764790178953776c93e21c"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'DeliveryTimeAccepted',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  5,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'OrderPaid',
  97,
  '0xd41936e5b3c52c4ec89e0c36a2ce1f4744d24706e6b6a62f6c0d88ecc39cd0f7',
  6,
  96697374,
  '2026-03-19T20:54:26.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4"}}'::jsonb
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
  'c6048a06-36f3-4901-b995-051d7c3234ca',
  'OrderFinalized',
  97,
  '0xfc3d2e6366c3e821ba050c46a02eaee464e7227c040014b2ce1434e32c8a2663',
  7,
  96697427,
  '2026-03-19T20:54:50.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x6154d16f4f52c1a4157928f136a53ac3b83b510b","orderUid":"4","args":{"orderId":"4","settlement":0}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
commit;
