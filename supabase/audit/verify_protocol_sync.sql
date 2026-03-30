select
  order_uid,
  status,
  buyer_address,
  seller_address,
  asset_token_id
from public.protocol_orders
where chain_id = 97
  and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495'
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
  and asset_contract = '0x72c3477c57097f3791501f3839bb380a019b754f'
order by token_id::int;
