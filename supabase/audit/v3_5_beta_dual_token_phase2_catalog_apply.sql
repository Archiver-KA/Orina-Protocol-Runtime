begin;

do $$
declare
  v_target_count integer;
  v_updated_count integer;
begin
  select count(*)
  into v_target_count
  from public.assets_catalog
  where asset_uid like 'v35-seed-p%-asset-%'
    and metadata ->> 'source_profile_id' ~ '^P[0-9]{3}$'
    and substring(metadata ->> 'source_profile_id' from 2)::integer between 51 and 100;

  if v_target_count <> 150 then
    raise exception 'Dual-token cohort B preflight failed: expected 150 assets, found %', v_target_count;
  end if;

  update public.assets_catalog
  set
    attributes = jsonb_set(
      attributes,
      '{estimated_price,currency}',
      to_jsonb('USDC'::text),
      true
    ),
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          metadata,
          '{currency}',
          to_jsonb('USDC'::text),
          true
        ),
        '{price}',
        to_jsonb(regexp_replace(coalesce(metadata ->> 'price', ''), '\s+USDT$', ' USDC')),
        true
      ),
      '{dual_token_policy}',
      jsonb_build_object(
        'phase', 'v3.5-beta-phase-2',
        'cohort', 'B',
        'paymentTokenSymbol', 'USDC.t',
        'paymentToken', '0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5',
        'appliedAt', now()
      ),
      true
    ),
    updated_at = now()
  where asset_uid like 'v35-seed-p%-asset-%'
    and metadata ->> 'source_profile_id' ~ '^P[0-9]{3}$'
    and substring(metadata ->> 'source_profile_id' from 2)::integer between 51 and 100;

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 150 then
    raise exception 'Dual-token cohort B update failed: expected 150 updates, got %', v_updated_count;
  end if;
end
$$;

refresh materialized view public.marketplace_asset_browse_index_v1;

commit;

select
  case
    when substring(metadata ->> 'source_profile_id' from 2)::integer between 1 and 50 then 'A'
    else 'B'
  end as cohort,
  metadata ->> 'currency' as currency,
  count(*) as asset_count
from public.assets_catalog
where asset_uid like 'v35-seed-p%-asset-%'
  and metadata ->> 'source_profile_id' ~ '^P[0-9]{3}$'
group by 1, 2
order by 1, 2;
