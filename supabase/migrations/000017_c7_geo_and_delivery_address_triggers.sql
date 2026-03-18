-- ATP2 Batch C7 / triggers for geo hierarchy + delivery addresses

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'public.set_updated_at() is required before applying 000017_c7_geo_and_delivery_address_triggers.sql';
  end if;
end
$$;

drop trigger if exists trg_geo_countries_set_updated_at on public.geo_countries;
create trigger trg_geo_countries_set_updated_at
before update on public.geo_countries
for each row execute function public.set_updated_at();

drop trigger if exists trg_geo_places_set_updated_at on public.geo_places;
create trigger trg_geo_places_set_updated_at
before update on public.geo_places
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_delivery_addresses_set_updated_at on public.user_delivery_addresses;
create trigger trg_user_delivery_addresses_set_updated_at
before update on public.user_delivery_addresses
for each row execute function public.set_updated_at();
