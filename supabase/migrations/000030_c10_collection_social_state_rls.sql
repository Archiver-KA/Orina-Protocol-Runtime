-- ATP2 Batch C10 / RLS for collection favorites and follows

alter table public.user_collection_favorites enable row level security;
alter table public.user_collection_follows enable row level security;

drop policy if exists user_collection_favorites_select_owner_claim_c10_v1 on public.user_collection_favorites;
create policy user_collection_favorites_select_owner_claim_c10_v1
on public.user_collection_favorites
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_favorites_insert_owner_claim_c10_v1 on public.user_collection_favorites;
create policy user_collection_favorites_insert_owner_claim_c10_v1
on public.user_collection_favorites
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_favorites_update_owner_claim_c10_v1 on public.user_collection_favorites;
create policy user_collection_favorites_update_owner_claim_c10_v1
on public.user_collection_favorites
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_favorites_delete_owner_claim_c10_v1 on public.user_collection_favorites;
create policy user_collection_favorites_delete_owner_claim_c10_v1
on public.user_collection_favorites
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_favorites_service_role_all_c10_v1 on public.user_collection_favorites;
create policy user_collection_favorites_service_role_all_c10_v1
on public.user_collection_favorites
for all
to service_role
using (true)
with check (true);

drop policy if exists user_collection_follows_select_owner_claim_c10_v1 on public.user_collection_follows;
create policy user_collection_follows_select_owner_claim_c10_v1
on public.user_collection_follows
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_follows_insert_owner_claim_c10_v1 on public.user_collection_follows;
create policy user_collection_follows_insert_owner_claim_c10_v1
on public.user_collection_follows
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_follows_update_owner_claim_c10_v1 on public.user_collection_follows;
create policy user_collection_follows_update_owner_claim_c10_v1
on public.user_collection_follows
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_follows_delete_owner_claim_c10_v1 on public.user_collection_follows;
create policy user_collection_follows_delete_owner_claim_c10_v1
on public.user_collection_follows
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_collection_follows_service_role_all_c10_v1 on public.user_collection_follows;
create policy user_collection_follows_service_role_all_c10_v1
on public.user_collection_follows
for all
to service_role
using (true)
with check (true);
