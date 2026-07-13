-- P0 hardening: protect trust fields, make protocol projections service-owned,
-- and only accept profile reviews tied to a finalized projected order.

begin;

-- ---------------------------------------------------------------------------
-- Profiles: owners may edit presentation fields, never trust/moderation fields.
-- ---------------------------------------------------------------------------

revoke insert, update on table public.profiles from authenticated;

grant insert (
  wallet_address,
  display_name,
  username,
  bio,
  avatar_url,
  banner_url,
  avatar_type,
  website,
  twitter,
  discord,
  telegram
) on table public.profiles to authenticated;

grant update (
  display_name,
  username,
  bio,
  avatar_url,
  banner_url,
  avatar_type,
  website,
  twitter,
  discord,
  telegram
) on table public.profiles to authenticated;

create or replace function public.protect_profile_trust_fields_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.is_verified := false;
      new.status := 'active';
      new.created_at := now();
      new.updated_at := now();
    elsif new.id is distinct from old.id
      or new.wallet_address is distinct from old.wallet_address
      or new.is_verified is distinct from old.is_verified
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at then
      raise exception 'profile trust and identity fields are server-managed'
        using errcode = '42501';
    end if;
  end if;
  return new;
end
$function$;

drop trigger if exists trg_profiles_protect_trust_fields_v1 on public.profiles;
create trigger trg_profiles_protect_trust_fields_v1
before insert or update on public.profiles
for each row execute function public.protect_profile_trust_fields_v1();

-- ---------------------------------------------------------------------------
-- Collections: owners cannot self-award verification/featured placement.
-- ---------------------------------------------------------------------------

revoke insert, update on table public.collections from authenticated;

grant insert (
  id,
  owner_user_id,
  owner_wallet_snapshot,
  slug,
  name,
  category,
  description,
  cover_image,
  bio,
  tags,
  metadata
) on table public.collections to authenticated;

grant update (
  slug,
  name,
  category,
  description,
  cover_image,
  bio,
  tags,
  metadata
) on table public.collections to authenticated;

create or replace function public.protect_collection_trust_fields_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.featured := false;
      new.created_at := now();
      new.updated_at := now();
    elsif new.id is distinct from old.id
      or new.owner_user_id is distinct from old.owner_user_id
      or new.owner_wallet_snapshot is distinct from old.owner_wallet_snapshot
      or new.verified is distinct from old.verified
      or new.featured is distinct from old.featured
      or new.created_at is distinct from old.created_at then
      raise exception 'collection ownership and trust fields are server-managed'
        using errcode = '42501';
    end if;
  end if;
  return new;
end
$function$;

drop trigger if exists trg_collections_protect_trust_fields_v1 on public.collections;
create trigger trg_collections_protect_trust_fields_v1
before insert or update on public.collections
for each row execute function public.protect_collection_trust_fields_v1();

-- Protocol tables are projections of on-chain state. Browser-authenticated users
-- may read them but may not create or mutate canonical projection rows.
revoke insert, update, delete on table public.protocol_assets from authenticated;
revoke insert, update, delete on table public.protocol_orders from authenticated;

-- uint256 identifiers must not be truncated to signed BIGINT/JavaScript Number.
alter table public.protocol_receipts
  alter column token_id type numeric(78, 0) using token_id::numeric,
  alter column order_id type numeric(78, 0) using order_id::numeric;

-- ---------------------------------------------------------------------------
-- Reviews: quarantine legacy unverifiable rows and expose one verified RPC.
-- ---------------------------------------------------------------------------

alter table public.profile_reviews
  add column if not exists chain_id bigint null,
  add column if not exists marketplace_contract text null;

alter table public.profile_reviews alter column verified set default false;

-- Existing rows are not trusted merely because a browser set verified=true.
update public.profile_reviews set verified = false where verified is distinct from false;

with uniquely_matched_reviews as (
  select
    pr.id,
    min(po.chain_id) as chain_id,
    min(lower(po.marketplace_contract)) as marketplace_contract,
    count(*) as match_count
  from public.profile_reviews pr
  join public.profiles reviewer on reviewer.id = pr.reviewer_user_id
  join public.profiles reviewed on reviewed.id = pr.reviewed_user_id
  join public.protocol_orders po
    on po.order_uid = pr.order_uid
   and (
     (pr.rating_type = 'seller'
       and lower(po.buyer_address) = reviewer.wallet_address
       and lower(po.seller_address) = reviewed.wallet_address)
     or
     (pr.rating_type = 'buyer'
       and lower(po.seller_address) = reviewer.wallet_address
       and lower(po.buyer_address) = reviewed.wallet_address)
   )
   and lower(trim(coalesce(po.status, ''))) in ('finalized', 'completed', 'settled', 'released')
  where nullif(trim(pr.order_uid), '') is not null
  group by pr.id
)
update public.profile_reviews pr
set
  chain_id = matched.chain_id,
  marketplace_contract = matched.marketplace_contract,
  verified = true
from uniquely_matched_reviews matched
where pr.id = matched.id
  and matched.match_count = 1;

alter table public.profile_reviews
  drop constraint if exists profile_reviews_verified_order_scope_chk;
alter table public.profile_reviews
  add constraint profile_reviews_verified_order_scope_chk
  check (
    verified = false
    or (
      chain_id is not null
      and marketplace_contract ~ '^0x[a-f0-9]{40}$'
      and nullif(trim(order_uid), '') is not null
    )
  ) not valid;

alter table public.profile_reviews
  validate constraint profile_reviews_verified_order_scope_chk;

drop index if exists public.profile_reviews_reviewer_reviewed_order_rating_uk;
create unique index if not exists profile_reviews_order_scope_rating_uk
  on public.profile_reviews (
    reviewer_user_id,
    reviewed_user_id,
    chain_id,
    marketplace_contract,
    order_uid,
    rating_type
  )
  where chain_id is not null
    and marketplace_contract is not null
    and order_uid is not null;

revoke insert, update, delete on table public.profile_reviews from authenticated;

drop policy if exists profile_reviews_insert_reviewer_claim_c15_v1 on public.profile_reviews;
drop policy if exists profile_reviews_update_reviewer_claim_c15_v1 on public.profile_reviews;
drop policy if exists profile_reviews_delete_reviewer_claim_c15_v1 on public.profile_reviews;
drop policy if exists profile_reviews_select_public_c15_v1 on public.profile_reviews;
create policy profile_reviews_select_verified_v2
on public.profile_reviews
for select
to public
using (verified = true);

create or replace function public.submit_profile_review_v2(
  p_chain_id bigint,
  p_marketplace_contract text,
  p_order_uid text,
  p_reviewed_wallet text,
  p_rating_type text,
  p_overall_rating numeric,
  p_communication_rating numeric,
  p_delivery_rating numeric,
  p_accuracy_rating numeric,
  p_review_text text default null,
  p_asset_uid text default null,
  p_asset_name text default null
)
returns public.profile_reviews
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_reviewer_id uuid;
  v_reviewer_wallet text;
  v_reviewed_id uuid;
  v_reviewed_wallet text := lower(trim(coalesce(p_reviewed_wallet, '')));
  v_marketplace_contract text := lower(trim(coalesce(p_marketplace_contract, '')));
  v_order_uid text := trim(coalesce(p_order_uid, ''));
  v_order public.protocol_orders%rowtype;
  v_asset_uid text;
  v_asset_name text;
  v_result public.profile_reviews%rowtype;
begin
  if public.atp2_claim_role_v1() <> 'authenticated' then
    raise exception 'authenticated wallet claim required' using errcode = '42501';
  end if;

  begin
    v_reviewer_id := public.atp2_claim_profile_id_text_v1()::uuid;
  exception when others then
    raise exception 'valid profile claim required' using errcode = '42501';
  end;
  v_reviewer_wallet := lower(trim(coalesce(public.atp2_claim_wallet_address_v1(), '')));

  if v_reviewer_wallet !~ '^0x[a-f0-9]{40}$'
    or v_reviewed_wallet !~ '^0x[a-f0-9]{40}$'
    or v_marketplace_contract !~ '^0x[a-f0-9]{40}$'
    or v_order_uid = ''
    or length(v_order_uid) > 200
    or p_chain_id is null
    or p_chain_id <= 0
    or p_rating_type is null
    or p_rating_type not in ('seller', 'buyer') then
    raise exception 'invalid review order scope or party' using errcode = '22023';
  end if;

  if p_overall_rating is null
    or p_communication_rating is null
    or p_delivery_rating is null
    or p_accuracy_rating is null
    or p_overall_rating not between 1 and 5
    or p_communication_rating not between 1 and 5
    or p_delivery_rating not between 1 and 5
    or p_accuracy_rating not between 1 and 5 then
    raise exception 'ratings must be between 1 and 5' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_reviewer_id
      and p.wallet_address = v_reviewer_wallet
      and p.status = 'active'
  ) then
    raise exception 'reviewer profile claim is inactive or inconsistent' using errcode = '42501';
  end if;

  select po.* into v_order
  from public.protocol_orders po
  where po.chain_id = p_chain_id
    and lower(po.marketplace_contract) = v_marketplace_contract
    and po.order_uid = v_order_uid
  limit 1;

  if v_order.id is null
    or lower(trim(coalesce(v_order.status, ''))) not in ('finalized', 'completed', 'settled', 'released') then
    raise exception 'review requires a finalized projected order' using errcode = '42501';
  end if;

  if p_rating_type = 'seller' then
    if lower(v_order.buyer_address) <> v_reviewer_wallet
      or lower(v_order.seller_address) <> v_reviewed_wallet then
      raise exception 'reviewer is not the buyer for this seller review' using errcode = '42501';
    end if;
  elsif lower(v_order.seller_address) <> v_reviewer_wallet
    or lower(v_order.buyer_address) <> v_reviewed_wallet then
    raise exception 'reviewer is not the seller for this buyer review' using errcode = '42501';
  end if;

  select p.id into v_reviewed_id
  from public.profiles p
  where p.wallet_address = v_reviewed_wallet
    and p.status = 'active'
  limit 1;
  if v_reviewed_id is null or v_reviewed_id = v_reviewer_id then
    raise exception 'reviewed profile is invalid' using errcode = '22023';
  end if;

  -- Asset labels are projection data, not reviewer-controlled metadata.
  select ac.asset_uid, ac.title
  into v_asset_uid, v_asset_name
  from public.asset_protocol_links apl
  join public.assets_catalog ac on ac.id = apl.asset_id
  where apl.chain_id = p_chain_id
    and lower(apl.contract_address) = lower(coalesce(v_order.asset_contract, ''))
    and apl.token_id = v_order.asset_token_id
  order by case when apl.link_type = 'primary' then 0 else 1 end, apl.created_at
  limit 1;

  insert into public.profile_reviews (
    reviewer_user_id,
    reviewed_user_id,
    chain_id,
    marketplace_contract,
    order_uid,
    asset_uid,
    asset_name,
    review_text,
    overall_rating,
    communication_rating,
    delivery_rating,
    accuracy_rating,
    rating_type,
    verified,
    helpful_count,
    metadata
  ) values (
    v_reviewer_id,
    v_reviewed_id,
    p_chain_id,
    v_marketplace_contract,
    v_order_uid,
    v_asset_uid,
    v_asset_name,
    nullif(left(trim(coalesce(p_review_text, '')), 4000), ''),
    p_overall_rating,
    p_communication_rating,
    p_delivery_rating,
    p_accuracy_rating,
    p_rating_type,
    true,
    0,
    jsonb_build_object(
      'source', 'submit_profile_review_v2',
      'chain_id', p_chain_id,
      'marketplace_contract', v_marketplace_contract,
      'order_uid', v_order_uid
    )
  )
  on conflict (
    reviewer_user_id,
    reviewed_user_id,
    chain_id,
    marketplace_contract,
    order_uid,
    rating_type
  ) where chain_id is not null
    and marketplace_contract is not null
    and order_uid is not null
  do update set
    asset_uid = excluded.asset_uid,
    asset_name = excluded.asset_name,
    review_text = excluded.review_text,
    overall_rating = excluded.overall_rating,
    communication_rating = excluded.communication_rating,
    delivery_rating = excluded.delivery_rating,
    accuracy_rating = excluded.accuracy_rating,
    verified = true,
    helpful_count = 0,
    metadata = excluded.metadata,
    updated_at = now()
  returning * into v_result;

  return v_result;
end
$function$;

revoke all on function public.submit_profile_review_v2(
  bigint,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
) from public, anon;
grant execute on function public.submit_profile_review_v2(
  bigint,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
) to authenticated;

comment on function public.submit_profile_review_v2(
  bigint,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
) is 'Creates or updates a verified review only when the JWT wallet is the expected party of a finalized projected order.';

commit;
