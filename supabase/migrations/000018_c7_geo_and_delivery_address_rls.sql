-- ATP2 Batch C7 / RLS for geo hierarchy + delivery addresses
-- Notes:
--   - geo reference tables are public-read, service-role write
--   - user delivery addresses are owner-scoped through claim bridge helpers

alter table public.geo_countries enable row level security;
alter table public.geo_places enable row level security;
alter table public.user_delivery_addresses enable row level security;
alter table public.geo_dataset_versions enable row level security;

drop policy if exists geo_countries_select_public_c7_v1 on public.geo_countries;
create policy geo_countries_select_public_c7_v1
on public.geo_countries
for select
to public
using (is_active = true);

drop policy if exists geo_places_select_public_c7_v1 on public.geo_places;
create policy geo_places_select_public_c7_v1
on public.geo_places
for select
to public
using (true);

drop policy if exists geo_dataset_versions_select_public_c7_v1 on public.geo_dataset_versions;
create policy geo_dataset_versions_select_public_c7_v1
on public.geo_dataset_versions
for select
to public
using (true);

drop policy if exists user_delivery_addresses_select_owner_claim_c7_v1 on public.user_delivery_addresses;
create policy user_delivery_addresses_select_owner_claim_c7_v1
on public.user_delivery_addresses
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_delivery_addresses_insert_owner_claim_c7_v1 on public.user_delivery_addresses;
create policy user_delivery_addresses_insert_owner_claim_c7_v1
on public.user_delivery_addresses
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_delivery_addresses_update_owner_claim_c7_v1 on public.user_delivery_addresses;
create policy user_delivery_addresses_update_owner_claim_c7_v1
on public.user_delivery_addresses
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

drop policy if exists user_delivery_addresses_delete_owner_claim_c7_v1 on public.user_delivery_addresses;
create policy user_delivery_addresses_delete_owner_claim_c7_v1
on public.user_delivery_addresses
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists geo_countries_service_role_all_c7_v1 on public.geo_countries;
create policy geo_countries_service_role_all_c7_v1
on public.geo_countries
for all
to service_role
using (true)
with check (true);

drop policy if exists geo_places_service_role_all_c7_v1 on public.geo_places;
create policy geo_places_service_role_all_c7_v1
on public.geo_places
for all
to service_role
using (true)
with check (true);

drop policy if exists geo_dataset_versions_service_role_all_c7_v1 on public.geo_dataset_versions;
create policy geo_dataset_versions_service_role_all_c7_v1
on public.geo_dataset_versions
for all
to service_role
using (true)
with check (true);

drop policy if exists user_delivery_addresses_service_role_all_c7_v1 on public.user_delivery_addresses;
create policy user_delivery_addresses_service_role_all_c7_v1
on public.user_delivery_addresses
for all
to service_role
using (true)
with check (true);
