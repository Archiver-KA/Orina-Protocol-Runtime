-- ATP2 Batch C8 / triggers for user app settings

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'public.set_updated_at() is required before applying 000020_c8_user_app_settings_triggers.sql';
  end if;
end
$$;

drop trigger if exists trg_user_app_settings_set_updated_at on public.user_app_settings;
create trigger trg_user_app_settings_set_updated_at
before update on public.user_app_settings
for each row execute function public.set_updated_at();
