begin;
insert into public.protocol_order_events (
  order_id, event_name, chain_id, tx_hash, log_index, block_number, block_time, payload
) values (
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'BuyerSigned1',
  97,
  '0xb8f9768aa5fc60b6101c4148144377b13e15fd882340d5180ae569a32abf460b',
  1,
  98281754,
  '2026-03-28T02:58:30.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","signature":"0xdca679ff5fd654e0bea2e1e4af22852f62bc5b8d6c59335ff400d2a0e65bdb145b5650639769a94e6192459259b8308a9682a0d4ee2ff5fc4c479861baae7b051c"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'OrderProposed',
  97,
  '0xb8f9768aa5fc60b6101c4148144377b13e15fd882340d5180ae569a32abf460b',
  2,
  98281754,
  '2026-03-28T02:58:30.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'SellerSigned',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  0,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","signature":"0xf109d989a182e788aa27f7f92a54b5fb6382257412ead98b883f346e9ca190707730e0893d288b835590dd509969ebc6ca088a37e0ac701134cae49d08613f2f1c"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'SellerConfirmed',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  1,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'DeliveryTimeSet',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  2,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","estDeliverySeconds":"259200"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'BuyerSigned2',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  4,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","signature":"0xdca679ff5fd654e0bea2e1e4af22852f62bc5b8d6c59335ff400d2a0e65bdb145b5650639769a94e6192459259b8308a9682a0d4ee2ff5fc4c479861baae7b051c"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'DeliveryTimeAccepted',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  5,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'OrderPaid',
  97,
  '0xf6dc8748c2160d2f7510b91272f3abf15b4190cae40877e5844d9fa7f19dfda0',
  6,
  98281759,
  '2026-03-28T02:58:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0"}}'::jsonb
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
  'af9a3f06-bd64-4c84-b5a2-a9d947aaaa49',
  'OrderFinalized',
  97,
  '0x17a0dabcabaccb58012fb9fda06d722f2b5a8c9a14bf4080841a275f09e40d13',
  12,
  98281764,
  '2026-03-28T02:58:35.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"0","args":{"orderId":"0","settlement":0}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'BuyerSigned1',
  97,
  '0x1e549443b11b35e086cb9baca29a12136d7b381adf4aa98f0c99972d60e9e069',
  24,
  98282124,
  '2026-03-28T03:01:17.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1","signature":"0xe16c1a2630d155151f00e1d6456984210c2d45bf95230eec1c8d04a612b561eb240e273c685f92940f1bcb3a3ad0563e36babb7d0bebc917e48a970f2772e2141c"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'OrderProposed',
  97,
  '0x1e549443b11b35e086cb9baca29a12136d7b381adf4aa98f0c99972d60e9e069',
  25,
  98282124,
  '2026-03-28T03:01:17.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'SellerConfirmed',
  97,
  '0x2925c8e99e5c5127d0d0bab78bc0a2e8759ed3e8fd5b8430c58ffbf6a6836471',
  9,
  98282130,
  '2026-03-28T03:01:20.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'DeliveryTimeSet',
  97,
  '0x2925c8e99e5c5127d0d0bab78bc0a2e8759ed3e8fd5b8430c58ffbf6a6836471',
  10,
  98282130,
  '2026-03-28T03:01:20.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1","estDeliverySeconds":"259200"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'DeliveryTimeAccepted',
  97,
  '0x2925c8e99e5c5127d0d0bab78bc0a2e8759ed3e8fd5b8430c58ffbf6a6836471',
  12,
  98282130,
  '2026-03-28T03:01:20.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'OrderPaid',
  97,
  '0x2925c8e99e5c5127d0d0bab78bc0a2e8759ed3e8fd5b8430c58ffbf6a6836471',
  13,
  98282130,
  '2026-03-28T03:01:20.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1"}}'::jsonb
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
  'a6010421-fd95-44f3-ae87-c76bdc17c8ec',
  'OrderFinalized',
  97,
  '0x6f0c4341be496f3e93a7e16caef4ff0d799ea7aa793950276b2dfcaddbc2f563',
  19,
  98282134,
  '2026-03-28T03:01:21.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"1","args":{"orderId":"1","settlement":0}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'BuyerSigned1',
  97,
  '0x36f03198241861c49214997a99b2e9a0530e85421b7d596458379283bcde6566',
  33,
  98282694,
  '2026-03-28T03:05:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","signature":"0x54cfab52b46eb38dbb69a616643dac569acce5661bb5e94f7146abc6e59c1b597efbee8c97247f0059dbd686165f2fa97908c51b3d0750cb791e9bb6bbf9b8651c"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'OrderProposed',
  97,
  '0x36f03198241861c49214997a99b2e9a0530e85421b7d596458379283bcde6566',
  34,
  98282694,
  '2026-03-28T03:05:33.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","buyer":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14","seller":"0x282Be18838D7079C215F49749a9606d77e00888b"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'SellerSigned',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  52,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","signature":"0x5c1d08716554848c1aa5df240f554a80a553d08e5b15794d1d2735483fbbdd561a059a462631fdd5732ada07e4cca5b92ed75b684acebd4a15ad1c583e25d4481b"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'SellerConfirmed',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  53,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'DeliveryTimeSet',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  54,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","estDeliverySeconds":"0"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'BuyerSigned2',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  56,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","signature":"0x54cfab52b46eb38dbb69a616643dac569acce5661bb5e94f7146abc6e59c1b597efbee8c97247f0059dbd686165f2fa97908c51b3d0750cb791e9bb6bbf9b8651c"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'DeliveryTimeAccepted',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  57,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'OrderPaid',
  97,
  '0xd108c6854982c7673ae1eda65177afaed14eea022b0f6beb7092210ea64cb95f',
  58,
  98282701,
  '2026-03-28T03:05:37.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'DisputeOpened',
  97,
  '0xeb45f8e4527b80562886dc0d837aeffcfc314ac98d809281726e6eb834b7435e',
  6,
  98282705,
  '2026-03-28T03:05:38.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","opener":"0xB43F3f31fae56C4e8C0be36EC6f84dD5B1571c14"}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'OrderFinalized',
  97,
  '0x64e2d34e7a16be35ff69988e22833855701e4bde8300a59caadef79551bff10b',
  8,
  98282779,
  '2026-03-28T03:06:12.000Z'::timestamptz,
  '{"sourceContract":"marketplace","contractAddress":"0x026c9e9a5d007ed46df3de900f53c0786ec650c8","orderUid":"2","args":{"orderId":"2","settlement":2}}'::jsonb
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
  '78bc5fad-c795-4c07-b720-fd1d5fb16eb2',
  'DisputeResolvedByAgreement',
  97,
  '0x64e2d34e7a16be35ff69988e22833855701e4bde8300a59caadef79551bff10b',
  11,
  98282779,
  '2026-03-28T03:06:12.000Z'::timestamptz,
  '{"sourceContract":"dispute_manager","contractAddress":"0xa31b543254c138178506244f20c0f7630b6709d5","orderUid":"2","args":{"orderId":"2","verdict":3,"buyerShareBps":"2500","sellerShareBps":"7500","signatureCount":"2"}}'::jsonb
)
on conflict (chain_id, tx_hash, log_index) do update set
  order_id = excluded.order_id,
  event_name = excluded.event_name,
  block_number = excluded.block_number,
  block_time = excluded.block_time,
  payload = excluded.payload;
commit;
