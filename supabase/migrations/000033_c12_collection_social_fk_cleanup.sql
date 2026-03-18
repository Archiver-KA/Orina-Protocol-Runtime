-- ATP2 Batch C12 / ensure collection social rows cascade with collections
-- Scope:
--   - remove orphaned collection favorite/follow rows
--   - enforce FK from social tables to canonical collections
--   - allow delete collection to cascade related social rows

delete from public.user_collection_favorites f
where not exists (
  select 1
  from public.collections c
  where c.id = f.collection_id
);

delete from public.user_collection_follows f
where not exists (
  select 1
  from public.collections c
  where c.id = f.collection_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_collection_favorites_collection_id_fkey'
  ) then
    alter table public.user_collection_favorites
      add constraint user_collection_favorites_collection_id_fkey
      foreign key (collection_id)
      references public.collections(id)
      on delete cascade;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_collection_follows_collection_id_fkey'
  ) then
    alter table public.user_collection_follows
      add constraint user_collection_follows_collection_id_fkey
      foreign key (collection_id)
      references public.collections(id)
      on delete cascade;
  end if;
end
$$;
