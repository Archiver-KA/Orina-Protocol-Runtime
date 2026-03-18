-- ATP2 Batch C8 / user app settings
-- Scope:
--   - owner-scoped settings row for the Settings page
--   - wallet address remains the identity truth through profiles mapping

create table if not exists public.user_app_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notification_settings jsonb not null default '{}'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  security_settings jsonb not null default '{}'::jsonb,
  display_settings jsonb not null default '{}'::jsonb,
  region_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_app_settings_notification_obj_chk
    check (jsonb_typeof(notification_settings) = 'object'),
  constraint user_app_settings_privacy_obj_chk
    check (jsonb_typeof(privacy_settings) = 'object'),
  constraint user_app_settings_security_obj_chk
    check (jsonb_typeof(security_settings) = 'object'),
  constraint user_app_settings_display_obj_chk
    check (jsonb_typeof(display_settings) = 'object'),
  constraint user_app_settings_region_obj_chk
    check (jsonb_typeof(region_settings) = 'object')
);
