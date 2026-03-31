-- ATP2 Batch C16 / canonical owner-only profile email in user_app_settings
-- Scope:
--   - move profile email off legacy user_preferences.ui_preferences
--   - keep user_app_settings as the owner-scoped canonical settings row

insert into public.user_app_settings (user_id, security_settings)
select
  up.user_id,
  jsonb_build_object(
    'profileEmail',
    lower(btrim(up.ui_preferences ->> 'profile_email'))
  )
from public.user_preferences up
where coalesce(btrim(up.ui_preferences ->> 'profile_email'), '') <> ''
on conflict (user_id) do update
set security_settings =
  coalesce(public.user_app_settings.security_settings, '{}'::jsonb)
  || excluded.security_settings;
