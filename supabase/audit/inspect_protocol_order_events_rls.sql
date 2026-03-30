select json_build_object(
  'table', 'public.protocol_order_events',
  'rls_enabled', (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'protocol_order_events'
  ),
  'rls_forced', (
    select c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'protocol_order_events'
  ),
  'policies', (
    select coalesce(
      json_agg(
        json_build_object(
          'policyname', p.policyname,
          'permissive', p.permissive,
          'roles', p.roles,
          'cmd', p.cmd,
          'qual', p.qual,
          'with_check', p.with_check
        )
        order by p.policyname
      ),
      '[]'::json
    )
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'protocol_order_events'
  ),
  'grants', json_build_array(
    json_build_object(
      'role_name', 'anon',
      'has_select', has_table_privilege('anon', 'public.protocol_order_events', 'select')
    ),
    json_build_object(
      'role_name', 'authenticated',
      'has_select', has_table_privilege('authenticated', 'public.protocol_order_events', 'select')
    ),
    json_build_object(
      'role_name', 'service_role',
      'has_select', has_table_privilege('service_role', 'public.protocol_order_events', 'select')
    )
  )
) as inspection;
