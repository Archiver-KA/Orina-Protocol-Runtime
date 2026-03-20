-- ATP2 Batch C14 / deployment-scoped protocol runtime uniqueness and lookup indexes
-- Rationale:
--   - order ids restart from 0 on each fresh Marketplace deployment
--   - runtime shadow rows must coexist across deployments on the same chain
--   - frontend hydrate paths now scope by (chain_id, marketplace_contract / asset_contract)

alter table public.protocol_orders
  drop constraint if exists protocol_orders_order_uid_uk;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'protocol_orders_chain_market_order_uid_uk'
      and conrelid = 'public.protocol_orders'::regclass
  ) then
    alter table public.protocol_orders
      add constraint protocol_orders_chain_market_order_uid_uk
      unique (chain_id, marketplace_contract, order_uid);
  end if;
end
$$;

create index if not exists idx_protocol_orders_chain_market_status_updated_at_desc
  on public.protocol_orders (chain_id, marketplace_contract, status, updated_at desc);

create index if not exists idx_protocol_orders_chain_market_buyer_updated_at_desc
  on public.protocol_orders (chain_id, marketplace_contract, buyer_address, updated_at desc);

create index if not exists idx_protocol_orders_chain_market_seller_updated_at_desc
  on public.protocol_orders (chain_id, marketplace_contract, seller_address, updated_at desc);

create index if not exists idx_protocol_assets_chain_contract_owner_updated_at_desc
  on public.protocol_assets (chain_id, asset_contract, owner_address, updated_at desc);
