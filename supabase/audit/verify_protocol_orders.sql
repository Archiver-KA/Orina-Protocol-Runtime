select
  order_uid,
  status,
  buyer_address,
  seller_address,
  asset_token_id,
  marketplace_contract
from public.protocol_orders
where chain_id = 97
  and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495'
order by order_uid::int;
