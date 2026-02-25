-- ATP2 Batch D1 (schema-only, no deploy)
-- Batch invariant: format batch: pham vi hep, checklist chot ro, test sau tung buoc.

create extension if not exists pgcrypto with schema public;
create extension if not exists citext with schema public;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

