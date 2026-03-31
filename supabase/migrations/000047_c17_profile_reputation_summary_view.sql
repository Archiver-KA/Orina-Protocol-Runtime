-- ATP2 Batch C17 / canonical profile reputation summary view
-- Scope:
--   - provide one DB-native summary row per profile for trust score, stars, and review counts
--   - keep profile_reviews as canonical review records and protocol_orders as canonical transaction source

drop view if exists public.profile_reputation_summaries;

create view public.profile_reputation_summaries as
with review_metrics as (
  select
    pr.reviewed_user_id as user_id,
    count(*)::integer as total_reviews,
    coalesce(avg(pr.overall_rating), 0)::numeric(12, 4) as average_rating,
    max(pr.created_at) as last_review_at
  from public.profile_reviews pr
  group by pr.reviewed_user_id
),
order_metrics as (
  select
    p.id as user_id,
    count(*) filter (
      where po.id is not null
        and (
          lower(coalesce(po.status, '')) like '%complete%'
          or lower(coalesce(po.status, '')) like '%final%'
          or lower(coalesce(po.status, '')) like '%deliver%'
          or lower(coalesce(po.status, '')) like '%release%'
          or lower(coalesce(po.status, '')) like '%settl%'
          or lower(coalesce(po.status, '')) like '%success%'
        )
    )::integer as successful_transactions,
    count(*) filter (
      where po.id is not null
        and (
          lower(coalesce(po.status, '')) like '%cancel%'
          or lower(coalesce(po.status, '')) like '%fail%'
          or lower(coalesce(po.status, '')) like '%expire%'
          or lower(coalesce(po.status, '')) like '%reject%'
          or lower(coalesce(po.status, '')) like '%revert%'
        )
    )::integer as failed_transactions,
    count(*) filter (
      where po.id is not null
        and lower(coalesce(po.status, '')) like '%disput%'
    )::integer as disputes_total,
    count(*) filter (
      where po.id is not null
        and lower(coalesce(po.status, '')) like '%resolv%'
    )::integer as disputes_resolved,
    coalesce(
      sum(
        case
          when po.id is not null
            and (
              lower(coalesce(po.status, '')) like '%complete%'
              or lower(coalesce(po.status, '')) like '%final%'
              or lower(coalesce(po.status, '')) like '%deliver%'
              or lower(coalesce(po.status, '')) like '%release%'
              or lower(coalesce(po.status, '')) like '%settl%'
              or lower(coalesce(po.status, '')) like '%success%'
            )
            then coalesce(po.total_value, po.amount * po.price_per_unit, 0)
          else 0
        end
      ),
      0
    )::numeric(24, 8) as total_volume,
    max(coalesce(po.updated_at, po.created_at)) as last_transaction_date
  from public.profiles p
  left join public.protocol_orders po
    on lower(coalesce(po.buyer_address, '')) = p.wallet_address
    or lower(coalesce(po.seller_address, '')) = p.wallet_address
  group by p.id
),
base as (
  select
    p.id as user_id,
    p.wallet_address,
    p.is_verified,
    greatest(floor(extract(epoch from (now() - p.created_at)) / 86400), 0)::integer as account_age_days,
    coalesce(rm.total_reviews, 0)::integer as total_reviews,
    coalesce(rm.average_rating, 0)::numeric(12, 4) as average_rating,
    coalesce(om.successful_transactions, 0)::integer as successful_transactions,
    coalesce(om.failed_transactions, 0)::integer as failed_transactions,
    (coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0))::integer as total_transactions,
    coalesce(om.total_volume, 0)::numeric(24, 8) as total_volume,
    case
      when (coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0)) > 0
        or coalesce(rm.total_reviews, 0) > 0
        then 45::numeric
      else 0::numeric
    end as average_response_time,
    case
      when (coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0)) > 0 then
        round(
          (coalesce(om.successful_transactions, 0)::numeric
          / nullif((coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0))::numeric, 0))
          * 100,
          4
        )
      when coalesce(rm.total_reviews, 0) > 0 then 100::numeric
      else 0::numeric
    end as completion_rate,
    case
      when (coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0)) > 0 then
        round(
          (coalesce(om.disputes_total, 0)::numeric
          / nullif((coalesce(om.successful_transactions, 0) + coalesce(om.failed_transactions, 0))::numeric, 0))
          * 100,
          4
        )
      else 0::numeric
    end as dispute_rate,
    coalesce(om.disputes_resolved, 0)::integer as disputes_resolved,
    coalesce(om.disputes_total, 0)::integer as disputes_total,
    om.last_transaction_date,
    rm.last_review_at,
    greatest(
      coalesce(om.last_transaction_date, '-infinity'::timestamptz),
      coalesce(rm.last_review_at, '-infinity'::timestamptz),
      p.updated_at
    ) as last_updated
  from public.profiles p
  left join review_metrics rm
    on rm.user_id = p.id
  left join order_metrics om
    on om.user_id = p.id
),
scores as (
  select
    base.*,
    case
      when base.total_transactions = 0 and base.total_reviews = 0 then 0
      else round(
        least((base.total_transactions::numeric / 50) * 50, 50)
        + least((base.total_volume / 100) * 50, 50)
      )::integer
    end as transaction_score,
    case
      when base.total_transactions = 0 and base.total_reviews = 0 then 50
      when base.total_reviews = 0 then 50
      else round(
        ((base.average_rating / 5) * 70)
        + least((base.total_reviews::numeric / 20) * 30, 30)
      )::integer
    end as rating_score,
    case
      when base.total_transactions = 0 and base.total_reviews = 0 then 50
      when base.average_response_time <= 15 then 100
      when base.average_response_time <= 30 then 90
      when base.average_response_time <= 60 then 80
      when base.average_response_time <= 120 then 70
      when base.average_response_time <= 240 then 60
      when base.average_response_time <= 480 then 50
      else 40
    end::integer as response_score,
    case
      when base.total_transactions = 0 and base.total_reviews = 0 then 50
      else round(base.completion_rate)::integer
    end as completion_score,
    case
      when base.total_transactions = 0 and base.total_reviews = 0 then 50
      when base.disputes_total = 0 then 100
      else round(
        least(
          greatest(100 - (base.dispute_rate * 2), 0)
          + ((base.disputes_resolved::numeric / nullif(base.disputes_total::numeric, 0)) * 20),
          100
        )
      )::integer
    end as dispute_score,
    round(
      (case when base.is_verified then 50 else 0 end)
      + least((base.account_age_days::numeric / 365) * 50, 50)
    )::integer as verification_score
  from base
),
final as (
  select
    scores.*,
    round(
      case
        when scores.total_transactions = 0 and scores.total_reviews = 0 then
          (0 * 0.25)
          + (50 * 0.25)
          + (50 * 0.15)
          + (50 * 0.15)
          + (50 * 0.10)
          + (scores.verification_score * 0.10)
        else
          (scores.transaction_score * 0.25)
          + (scores.rating_score * 0.25)
          + (scores.response_score * 0.15)
          + (scores.completion_score * 0.15)
          + (scores.dispute_score * 0.10)
          + (scores.verification_score * 0.10)
      end
    )::integer as overall_score
  from scores
)
select
  final.user_id,
  final.wallet_address,
  final.overall_score,
  case
    when final.overall_score >= 90 then 'diamond'
    when final.overall_score >= 80 then 'platinum'
    when final.overall_score >= 60 then 'gold'
    when final.overall_score >= 40 then 'silver'
    when final.overall_score >= 20 then 'bronze'
    else 'newcomer'
  end as level,
  final.transaction_score,
  final.rating_score,
  final.response_score,
  final.completion_score,
  final.dispute_score,
  final.verification_score,
  final.total_transactions,
  final.successful_transactions,
  final.failed_transactions,
  round(final.total_volume, 8) as total_volume,
  round(final.average_rating, 2) as average_rating,
  final.total_reviews,
  round(final.average_response_time, 2) as average_response_time,
  round(final.completion_rate, 2) as completion_rate,
  round(final.dispute_rate, 2) as dispute_rate,
  final.disputes_resolved,
  final.disputes_total,
  final.account_age_days,
  final.is_verified,
  final.is_verified as email_verified,
  false as phone_verified,
  false as kyc_verified,
  (final.successful_transactions > 0) as has_escrow,
  (final.overall_score >= 80) as premium_member,
  final.last_transaction_date,
  final.last_updated
from final;

grant select on public.profile_reputation_summaries to anon, authenticated, service_role;
