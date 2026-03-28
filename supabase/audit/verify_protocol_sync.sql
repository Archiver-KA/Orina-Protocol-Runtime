select
  order_uid,
  status,
  buyer_address,
  seller_address,
  asset_token_id
from public.protocol_orders
where chain_id = 97
  and marketplace_contract = '0x026c9e9a5d007ed46df3de900f53c0786ec650c8'
order by order_uid::int;

select
  order_id,
  event_name,
  tx_hash,
  log_index
from public.protocol_order_events
where chain_id = 97
order by block_number asc, log_index asc;

select
  token_id,
  owner_address,
  status
from public.protocol_assets
where chain_id = 97
  and asset_contract = '0x5fc61747b359e089e3ced00494f9e71de836b666'
order by token_id::int;
