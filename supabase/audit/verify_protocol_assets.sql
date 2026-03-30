select
  token_id,
  owner_address,
  status,
  asset_contract
from public.protocol_assets
where chain_id = 97
  and asset_contract = '0x72c3477c57097f3791501f3839bb380a019b754f'
  and token_id in ('0', '1', '2')
order by token_id::int;
