-- Run against a migrated Supabase test database. These assertions inspect
-- effective privileges rather than merely checking migration text.
begin;

do $$
declare signature text;
declare function_oid oid;
declare public_can_execute boolean;
begin
  foreach signature in array array[
    'public.claim_checkout(uuid)',
    'public.claim_stripe_event(text,text,bigint)',
    'public.rename_project(uuid,uuid,text,integer)',
    'public.set_subscription_suspension(text,boolean,bigint,text)'
  ] loop
    function_oid := pg_catalog.to_regprocedure(signature);
    select coalesce(bool_or(acl.privilege_type = 'EXECUTE'), false)
      into public_can_execute
      from pg_catalog.pg_proc proc
      cross join lateral pg_catalog.aclexplode(coalesce(proc.proacl, pg_catalog.acldefault('f', proc.proowner))) acl
      where proc.oid = function_oid and acl.grantee = 0;
    if public_can_execute
       or pg_catalog.has_function_privilege('anon',signature,'execute')
       or pg_catalog.has_function_privilege('authenticated',signature,'execute') then
      raise exception 'untrusted role can execute %', signature;
    end if;
    if not pg_catalog.has_function_privilege('service_role',signature,'execute') then
      raise exception 'service_role cannot execute %', signature;
    end if;
  end loop;

  select coalesce(bool_or(acl.privilege_type = 'EXECUTE'), false)
    into public_can_execute
    from pg_catalog.pg_proc proc
    cross join lateral pg_catalog.aclexplode(coalesce(proc.proacl, pg_catalog.acldefault('f', proc.proowner))) acl
    where proc.oid = 'public.handle_new_user()'::regprocedure and acl.grantee = 0;
  if public_can_execute
     or pg_catalog.has_function_privilege('anon','public.handle_new_user()','execute')
     or pg_catalog.has_function_privilege('authenticated','public.handle_new_user()','execute') then
    raise exception 'trigger function is directly executable by an application role';
  end if;
end
$$;

rollback;
