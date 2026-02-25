-- ATP2 Batch D2 / triggers (updated_at only)
-- Invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.
-- Scope: attach shared set_updated_at() to mutable tables. No RLS in this file.

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'public.set_updated_at() is required before applying 000007_d2_triggers_updated_at.sql';
  end if;
end
$$;

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_preferences_set_updated_at on public.user_preferences;
create trigger trg_user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_assets_catalog_set_updated_at on public.assets_catalog;
create trigger trg_assets_catalog_set_updated_at
before update on public.assets_catalog
for each row execute function public.set_updated_at();

drop trigger if exists trg_watchlist_alerts_set_updated_at on public.watchlist_alerts;
create trigger trg_watchlist_alerts_set_updated_at
before update on public.watchlist_alerts
for each row execute function public.set_updated_at();

drop trigger if exists trg_community_posts_set_updated_at on public.community_posts;
create trigger trg_community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

drop trigger if exists trg_community_comments_set_updated_at on public.community_comments;
create trigger trg_community_comments_set_updated_at
before update on public.community_comments
for each row execute function public.set_updated_at();

drop trigger if exists trg_protocol_assets_set_updated_at on public.protocol_assets;
create trigger trg_protocol_assets_set_updated_at
before update on public.protocol_assets
for each row execute function public.set_updated_at();

drop trigger if exists trg_protocol_orders_set_updated_at on public.protocol_orders;
create trigger trg_protocol_orders_set_updated_at
before update on public.protocol_orders
for each row execute function public.set_updated_at();
