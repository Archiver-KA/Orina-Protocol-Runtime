select 'protocol_orders' as table_name, count(*)::text as row_count
from public.protocol_orders
where chain_id = 97
  and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495'

union all

select 'protocol_assets' as table_name, count(*)::text as row_count
from public.protocol_assets
where chain_id = 97
  and asset_contract = '0x72c3477c57097f3791501f3839bb380a019b754f'

union all

select 'protocol_order_events' as table_name, count(*)::text as row_count
from public.protocol_order_events
where chain_id = 97
  and order_id in (
    select id
    from public.protocol_orders
    where chain_id = 97
      and marketplace_contract = '0xbc6f46000b2709714c3908bb6b71bab67a2d1495'
  );
