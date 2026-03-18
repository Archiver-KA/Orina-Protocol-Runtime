-- ATP2 Batch C8 / RLS for user app settings

alter table public.user_app_settings enable row level security;

drop policy if exists user_app_settings_select_owner_claim_c8_v1 on public.user_app_settings;
create policy user_app_settings_select_owner_claim_c8_v1
on public.user_app_settings
for select
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_app_settings_insert_owner_claim_c8_v1 on public.user_app_settings;
create policy user_app_settings_insert_owner_claim_c8_v1
on public.user_app_settings
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_app_settings_update_owner_claim_c8_v1 on public.user_app_settings;
create policy user_app_settings_update_owner_claim_c8_v1
on public.user_app_settings
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

drop policy if exists user_app_settings_delete_owner_claim_c8_v1 on public.user_app_settings;
create policy user_app_settings_delete_owner_claim_c8_v1
on public.user_app_settings
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists user_app_settings_service_role_all_c8_v1 on public.user_app_settings;
create policy user_app_settings_service_role_all_c8_v1
on public.user_app_settings
for all
to service_role
using (true)
with check (true);
