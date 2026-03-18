-- ATP2 Batch C11 / RLS for collections and collection asset memberships

alter table public.collections enable row level security;
alter table public.collection_assets enable row level security;

drop policy if exists collections_select_public_c11_v1 on public.collections;
create policy collections_select_public_c11_v1
on public.collections
for select
to public
using (true);

drop policy if exists collections_insert_owner_claim_c11_v1 on public.collections;
create policy collections_insert_owner_claim_c11_v1
on public.collections
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and owner_user_id::text = public.atp2_claim_profile_id_text_v1()
  and owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
);

drop policy if exists collections_update_owner_claim_c11_v1 on public.collections;
create policy collections_update_owner_claim_c11_v1
on public.collections
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and owner_user_id::text = public.atp2_claim_profile_id_text_v1()
  and owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and owner_user_id::text = public.atp2_claim_profile_id_text_v1()
  and owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
);

drop policy if exists collections_delete_owner_claim_c11_v1 on public.collections;
create policy collections_delete_owner_claim_c11_v1
on public.collections
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and owner_user_id::text = public.atp2_claim_profile_id_text_v1()
  and owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
);

drop policy if exists collections_service_role_all_c11_v1 on public.collections;
create policy collections_service_role_all_c11_v1
on public.collections
for all
to service_role
using (true)
with check (true);

drop policy if exists collection_assets_select_public_c11_v1 on public.collection_assets;
create policy collection_assets_select_public_c11_v1
on public.collection_assets
for select
to public
using (true);

drop policy if exists collection_assets_insert_owner_claim_c11_v1 on public.collection_assets;
create policy collection_assets_insert_owner_claim_c11_v1
on public.collection_assets
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and added_by_user_id::text = public.atp2_claim_profile_id_text_v1()
  and added_by_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.owner_user_id::text = public.atp2_claim_profile_id_text_v1()
      and c.owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  )
);

drop policy if exists collection_assets_update_owner_claim_c11_v1 on public.collection_assets;
create policy collection_assets_update_owner_claim_c11_v1
on public.collection_assets
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.owner_user_id::text = public.atp2_claim_profile_id_text_v1()
      and c.owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  )
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and added_by_user_id::text = public.atp2_claim_profile_id_text_v1()
  and added_by_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.owner_user_id::text = public.atp2_claim_profile_id_text_v1()
      and c.owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  )
);

drop policy if exists collection_assets_delete_owner_claim_c11_v1 on public.collection_assets;
create policy collection_assets_delete_owner_claim_c11_v1
on public.collection_assets
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and exists (
    select 1
    from public.collections c
    where c.id = collection_id
      and c.owner_user_id::text = public.atp2_claim_profile_id_text_v1()
      and c.owner_wallet_snapshot = public.atp2_claim_wallet_address_v1()
  )
);

drop policy if exists collection_assets_service_role_all_c11_v1 on public.collection_assets;
create policy collection_assets_service_role_all_c11_v1
on public.collection_assets
for all
to service_role
using (true)
with check (true);
