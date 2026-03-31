-- ATP2 Batch C15 / public profile story + canonical profile reviews
-- Scope:
--   - public-readable story document per profile
--   - canonical profile reviews for aggregated trust score
--   - owner-scoped writes via claim bridge

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
  ) then
    raise exception 'public.set_updated_at() is required before applying 000045_c15_profile_story_and_reviews.sql';
  end if;
end
$$;

create table if not exists public.profile_story_documents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  story_document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_story_documents_story_document_obj_chk
    check (jsonb_typeof(story_document) = 'object')
);

create table if not exists public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_user_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  order_uid text null,
  asset_uid text null,
  asset_name text null,
  review_text text null,
  overall_rating numeric(3, 2) not null,
  communication_rating numeric(3, 2) not null,
  delivery_rating numeric(3, 2) not null,
  accuracy_rating numeric(3, 2) not null,
  rating_type text not null,
  response_text text null,
  response_date timestamptz null,
  verified boolean not null default true,
  helpful_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_reviews_rating_type_chk
    check (rating_type in ('seller', 'buyer')),
  constraint profile_reviews_reviewer_reviewed_chk
    check (reviewer_user_id <> reviewed_user_id),
  constraint profile_reviews_overall_rating_chk
    check (overall_rating between 1 and 5),
  constraint profile_reviews_communication_rating_chk
    check (communication_rating between 1 and 5),
  constraint profile_reviews_delivery_rating_chk
    check (delivery_rating between 1 and 5),
  constraint profile_reviews_accuracy_rating_chk
    check (accuracy_rating between 1 and 5),
  constraint profile_reviews_helpful_count_chk
    check (helpful_count >= 0),
  constraint profile_reviews_metadata_obj_chk
    check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists profile_reviews_reviewer_reviewed_order_rating_uk
  on public.profile_reviews (reviewer_user_id, reviewed_user_id, order_uid, rating_type);

create index if not exists idx_profile_reviews_reviewed_created_at
  on public.profile_reviews (reviewed_user_id, created_at desc);

create index if not exists idx_profile_reviews_reviewer_created_at
  on public.profile_reviews (reviewer_user_id, created_at desc);

insert into public.profile_story_documents (user_id, story_document)
select
  up.user_id,
  up.ui_preferences -> 'story_document'
from public.user_preferences up
where jsonb_typeof(up.ui_preferences -> 'story_document') = 'object'
on conflict (user_id) do update
set story_document = excluded.story_document
where public.profile_story_documents.story_document = '{}'::jsonb;

drop trigger if exists trg_profile_story_documents_set_updated_at on public.profile_story_documents;
create trigger trg_profile_story_documents_set_updated_at
before update on public.profile_story_documents
for each row execute function public.set_updated_at();

drop trigger if exists trg_profile_reviews_set_updated_at on public.profile_reviews;
create trigger trg_profile_reviews_set_updated_at
before update on public.profile_reviews
for each row execute function public.set_updated_at();

alter table public.profile_story_documents enable row level security;
alter table public.profile_reviews enable row level security;

drop policy if exists profile_story_documents_select_public_c15_v1 on public.profile_story_documents;
create policy profile_story_documents_select_public_c15_v1
on public.profile_story_documents
for select
to public
using (true);

drop policy if exists profile_story_documents_insert_owner_claim_c15_v1 on public.profile_story_documents;
create policy profile_story_documents_insert_owner_claim_c15_v1
on public.profile_story_documents
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists profile_story_documents_update_owner_claim_c15_v1 on public.profile_story_documents;
create policy profile_story_documents_update_owner_claim_c15_v1
on public.profile_story_documents
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

drop policy if exists profile_story_documents_delete_owner_claim_c15_v1 on public.profile_story_documents;
create policy profile_story_documents_delete_owner_claim_c15_v1
on public.profile_story_documents
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists profile_story_documents_service_role_all_c15_v1 on public.profile_story_documents;
create policy profile_story_documents_service_role_all_c15_v1
on public.profile_story_documents
for all
to service_role
using (true)
with check (true);

drop policy if exists profile_reviews_select_public_c15_v1 on public.profile_reviews;
create policy profile_reviews_select_public_c15_v1
on public.profile_reviews
for select
to public
using (true);

drop policy if exists profile_reviews_insert_reviewer_claim_c15_v1 on public.profile_reviews;
create policy profile_reviews_insert_reviewer_claim_c15_v1
on public.profile_reviews
for insert
to authenticated
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and reviewer_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists profile_reviews_update_reviewer_claim_c15_v1 on public.profile_reviews;
create policy profile_reviews_update_reviewer_claim_c15_v1
on public.profile_reviews
for update
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and reviewer_user_id::text = public.atp2_claim_profile_id_text_v1()
)
with check (
  public.atp2_claim_role_v1() = 'authenticated'
  and reviewer_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists profile_reviews_delete_reviewer_claim_c15_v1 on public.profile_reviews;
create policy profile_reviews_delete_reviewer_claim_c15_v1
on public.profile_reviews
for delete
to authenticated
using (
  public.atp2_claim_role_v1() = 'authenticated'
  and reviewer_user_id::text = public.atp2_claim_profile_id_text_v1()
);

drop policy if exists profile_reviews_service_role_all_c15_v1 on public.profile_reviews;
create policy profile_reviews_service_role_all_c15_v1
on public.profile_reviews
for all
to service_role
using (true)
with check (true);
