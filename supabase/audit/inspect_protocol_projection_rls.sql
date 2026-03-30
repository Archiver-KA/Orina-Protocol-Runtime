select json_build_object(
  'table', 'public.protocol_assets',
  'rls_enabled', (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'protocol_assets'
  ),
  'policies', (
    select coalesce(
      json_agg(
        json_build_object(
          'policyname', p.policyname,
          'cmd', p.cmd,
          'roles', p.roles,
          'qual', p.qual,
          'with_check', p.with_check
        )
        order by p.policyname
      ),
      '[]'::json
    )
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'protocol_assets'
  )
) as inspection

union all

select json_build_object(
  'table', 'public.protocol_orders',
  'rls_enabled', (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'protocol_orders'
  ),
  'policies', (
    select coalesce(
      json_agg(
        json_build_object(
          'policyname', p.policyname,
          'cmd', p.cmd,
          'roles', p.roles,
          'qual', p.qual,
          'with_check', p.with_check
        )
        order by p.policyname
      ),
      '[]'::json
    )
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'protocol_orders'
  )
) as inspection;
