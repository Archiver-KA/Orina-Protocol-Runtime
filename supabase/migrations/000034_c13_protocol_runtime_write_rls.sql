-- ATP2 Batch C13 / protocol runtime write policies
-- Scope:
--   - allow authenticated wallet-claimed sessions to write their own protocol assets
--   - allow authenticated wallet-claimed sessions to write protocol orders where they are buyer or seller
-- Invariant:
--   - public select remains unchanged
--   - service_role keeps full access

drop policy if exists protocol_assets_authenticated_insert_owner_v1 on public.protocol_assets;
create policy protocol_assets_authenticated_insert_owner_v1
on public.protocol_assets
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and nullif(lower(trim(owner_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
);

drop policy if exists protocol_assets_authenticated_update_owner_v1 on public.protocol_assets;
create policy protocol_assets_authenticated_update_owner_v1
on public.protocol_assets
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and nullif(lower(trim(owner_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and nullif(lower(trim(owner_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
);

drop policy if exists protocol_assets_authenticated_delete_owner_v1 on public.protocol_assets;
create policy protocol_assets_authenticated_delete_owner_v1
on public.protocol_assets
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and nullif(lower(trim(owner_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
);

drop policy if exists protocol_orders_authenticated_insert_party_v1 on public.protocol_orders;
create policy protocol_orders_authenticated_insert_party_v1
on public.protocol_orders
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and (
    nullif(lower(trim(buyer_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
    or nullif(lower(trim(seller_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
  )
);

drop policy if exists protocol_orders_authenticated_update_party_v1 on public.protocol_orders;
create policy protocol_orders_authenticated_update_party_v1
on public.protocol_orders
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and (
    nullif(lower(trim(buyer_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
    or nullif(lower(trim(seller_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
  )
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and (
    nullif(lower(trim(buyer_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
    or nullif(lower(trim(seller_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
  )
);

drop policy if exists protocol_orders_authenticated_delete_party_v1 on public.protocol_orders;
create policy protocol_orders_authenticated_delete_party_v1
on public.protocol_orders
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and (
    nullif(lower(trim(buyer_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
    or nullif(lower(trim(seller_address)), '') = nullif(lower(trim(public.atp2_claim_wallet_address_v1())), '')
  )
);
