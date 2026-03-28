select
  order_uid,
  status,
  buyer_address,
  seller_address,
  asset_token_id,
  marketplace_contract
from public.protocol_orders
where chain_id = 97
  and marketplace_contract = '0x026c9e9a5d007ed46df3de900f53c0786ec650c8'
order by order_uid::int;
