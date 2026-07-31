-- Keep risk ordering separate from ordinary subscription webhook ordering.
-- Existing rows have no prior risk cursor; their current suspended value is preserved.
alter table public.subscriptions
  add column if not exists last_risk_event_created bigint,
  add column if not exists last_risk_event_id text;

create or replace function public.set_subscription_suspension(
  p_customer_id text,
  p_suspended boolean,
  p_event_created bigint,
  p_event_id text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_customer_id is null or p_event_id is null or p_event_id = '' or p_event_created < 0 then
    raise exception 'Invalid risk event';
  end if;

  update public.subscriptions
  set suspended = p_suspended,
      last_risk_event_created = p_event_created,
      last_risk_event_id = p_event_id,
      updated_at = pg_catalog.now()
  where stripe_customer_id = p_customer_id
    and (
      last_risk_event_created is null
      or p_event_created > last_risk_event_created
      or (
        p_event_created = last_risk_event_created
        and (
          -- Stripe timestamps have one-second precision. Suspension has higher
          -- precedence than restoration at the same second; event ID orders
          -- otherwise-equal decisions. This makes every delivery order converge.
          (p_suspended and not suspended)
          or (p_suspended = suspended and p_event_id > coalesce(last_risk_event_id, ''))
        )
      )
    );
end
$$;

comment on function public.set_subscription_suspension(text, boolean, bigint, text) is
  'Service-only atomic risk decision: created time, suspension precedence, then event ID determine order.';

create or replace function public.claim_checkout(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare claimed boolean;
begin
  insert into public.subscriptions(user_id,status,checkout_pending_until)
    values(p_user_id,'free',pg_catalog.now()+interval '15 minutes')
  on conflict(user_id) do update set checkout_pending_until=excluded.checkout_pending_until
    where public.subscriptions.checkout_pending_until is null
       or public.subscriptions.checkout_pending_until < pg_catalog.now()
  returning true into claimed;
  return coalesce(claimed,false);
end
$$;

create or replace function public.claim_stripe_event(p_event_id text,p_event_type text,p_created bigint)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare current_state text;
begin
  insert into public.stripe_events(event_id,event_type,created,state,processed,processing_started_at)
    values(p_event_id,p_event_type,p_created,'processing',false,pg_catalog.now()) on conflict do nothing;
  if found then return 'claimed'; end if;
  select state into current_state from public.stripe_events where event_id=p_event_id for update;
  if current_state='processed' then return 'processed'; end if;
  if current_state='processing' and (select processing_started_at > pg_catalog.now()-interval '5 minutes' from public.stripe_events where event_id=p_event_id) then return 'busy'; end if;
  update public.stripe_events set state='processing',processing_started_at=pg_catalog.now(),error=null where event_id=p_event_id;
  return 'claimed';
end
$$;

create or replace function public.rename_project(p_id uuid,p_owner_id uuid,p_name text,p_version integer)
returns table(id uuid,name text,version integer,updated_at timestamptz)
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.projects set name=p_name,data=pg_catalog.jsonb_set(data,'{name}',pg_catalog.to_jsonb(p_name),false),version=public.projects.version+1,updated_at=pg_catalog.now()
  where public.projects.id=p_id and owner_id=p_owner_id and public.projects.version=p_version
  returning public.projects.id,public.projects.name,public.projects.version,public.projects.updated_at;
$$;

-- rename_project is called by a server route after authentication, using the
-- service-role client. Keeping every argument-taking definer RPC server-only
-- prevents clients from supplying another user's identifiers.
revoke all on function public.claim_checkout(uuid) from public, anon, authenticated;
revoke all on function public.claim_stripe_event(text, text, bigint) from public, anon, authenticated;
revoke all on function public.rename_project(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.set_subscription_suspension(text, boolean, bigint, text) from public, anon, authenticated;
grant execute on function public.claim_checkout(uuid) to service_role;
grant execute on function public.claim_stripe_event(text, text, bigint) to service_role;
grant execute on function public.rename_project(uuid, uuid, text, integer) to service_role;
grant execute on function public.set_subscription_suspension(text, boolean, bigint, text) to service_role;

-- Trigger invocation does not require application roles to execute the trigger
-- function directly. The trigger owner retains the privileges it needs.
alter function public.handle_new_user() set search_path = public, pg_temp;
revoke all on function public.handle_new_user() from public, anon, authenticated;
