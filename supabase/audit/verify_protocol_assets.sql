select
  token_id,
  owner_address,
  status,
  asset_contract
from public.protocol_assets
where chain_id = 97
  and asset_contract = '0x5fc61747b359e089e3ced00494f9e71de836b666'
  and token_id in ('0', '1', '2')
order by token_id::int;
