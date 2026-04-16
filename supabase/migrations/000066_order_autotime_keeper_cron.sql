-- 000066 - Order autotime keeper cron wiring
-- Secrets stay out of git. Seed Vault values after deploy, then call
-- public.configure_order_autotime_keeper_cron().

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create or replace function public.configure_order_autotime_keeper_cron(
  p_schedule text default '*/5 * * * *',
  p_job_name text default 'orina-order-autotime-v1-every-5m',
  p_limit integer default 50,
  p_batch_size integer default 20,
  p_sync_receipts boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_job_id bigint;
  v_existing_job_id bigint;
  v_project_url text;
  v_service_role_key text;
  v_request_url text;
  v_request_body jsonb;
begin
  select ds.decrypted_secret
    into v_project_url
  from vault.decrypted_secrets ds
  where ds.name = 'orina_order_autotime_project_url'
  order by ds.created_at desc
  limit 1;

  select ds.decrypted_secret
    into v_service_role_key
  from vault.decrypted_secrets ds
  where ds.name = 'orina_order_autotime_service_role_key'
  order by ds.created_at desc
  limit 1;

  if coalesce(v_project_url, '') = '' then
    raise exception 'Vault secret orina_order_autotime_project_url is not configured';
  end if;

  if coalesce(v_service_role_key, '') = '' then
    raise exception 'Vault secret orina_order_autotime_service_role_key is not configured';
  end if;

  v_request_url := regexp_replace(v_project_url, '/+$', '') || '/functions/v1/orina-order-autotime-v1/run';
  v_request_body := jsonb_build_object(
    'limit', greatest(1, least(coalesce(p_limit, 50), 200)),
    'batchSize', greatest(1, least(coalesce(p_batch_size, 20), 100)),
    'syncReceipts', coalesce(p_sync_receipts, true)
  );

  select j.jobid
    into v_existing_job_id
  from cron.job j
  where j.jobname = p_job_name
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  select cron.schedule(
    p_job_name,
    p_schedule,
    format(
      $job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', %L,
          'apikey', %L
        ),
        body := %L::jsonb
      );
      $job$,
      v_request_url,
      'Bearer ' || v_service_role_key,
      v_service_role_key,
      v_request_body::text
    )
  )
  into v_job_id;

  return v_job_id;
end;
$$;

create or replace function public.disable_order_autotime_keeper_cron(
  p_job_name text default 'orina-order-autotime-v1-every-5m'
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_existing_job_id bigint;
begin
  select j.jobid
    into v_existing_job_id
  from cron.job j
  where j.jobname = p_job_name
  limit 1;

  if v_existing_job_id is null then
    return false;
  end if;

  perform cron.unschedule(v_existing_job_id);
  return true;
end;
$$;

revoke all on function public.configure_order_autotime_keeper_cron(text, text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.disable_order_autotime_keeper_cron(text) from public, anon, authenticated;
grant execute on function public.configure_order_autotime_keeper_cron(text, text, integer, integer, boolean) to service_role;
grant execute on function public.disable_order_autotime_keeper_cron(text) to service_role;
