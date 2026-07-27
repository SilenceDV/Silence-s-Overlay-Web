alter table public.stripe_events add column if not exists state text not null default 'pending';
alter table public.stripe_events add column if not exists processing_started_at timestamptz;
update public.stripe_events set state='processed' where processed=true and state='pending';
alter table public.stripe_events add constraint stripe_events_state_check check (state in ('pending','processing','processed','failed'));
create index if not exists stripe_events_retryable on public.stripe_events(state, received_at);
alter table public.subscriptions add column if not exists checkout_pending_until timestamptz;
alter table public.subscriptions add column if not exists last_stripe_event_id text;

create or replace function public.claim_checkout(p_user_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare claimed boolean;
begin
  insert into subscriptions(user_id,status,checkout_pending_until) values(p_user_id,'free',now()+interval '15 minutes')
  on conflict(user_id) do update set checkout_pending_until=excluded.checkout_pending_until
    where subscriptions.checkout_pending_until is null or subscriptions.checkout_pending_until < now()
  returning true into claimed;
  return coalesce(claimed,false);
end$$;

create or replace function public.claim_stripe_event(p_event_id text,p_event_type text,p_created bigint) returns text language plpgsql security definer set search_path=public as $$
declare current_state text;
begin
  insert into stripe_events(event_id,event_type,created,state,processed,processing_started_at)
    values(p_event_id,p_event_type,p_created,'processing',false,now()) on conflict do nothing;
  if found then return 'claimed'; end if;
  select state into current_state from stripe_events where event_id=p_event_id for update;
  if current_state='processed' then return 'processed'; end if;
  if current_state='processing' and (select processing_started_at > now()-interval '5 minutes' from stripe_events where event_id=p_event_id) then return 'busy'; end if;
  update stripe_events set state='processing',processing_started_at=now(),error=null where event_id=p_event_id;
  return 'claimed';
end$$;
comment on function public.claim_stripe_event is 'Atomically claims new and failed Stripe events; stale processing leases expire after five minutes.';

create or replace function public.rename_project(p_id uuid,p_owner_id uuid,p_name text,p_version integer)
returns table(id uuid,name text,version integer,updated_at timestamptz) language sql security definer set search_path=public as $$
  update projects set name=p_name,data=jsonb_set(data,'{name}',to_jsonb(p_name),false),version=projects.version+1,updated_at=now()
  where projects.id=p_id and owner_id=p_owner_id and projects.version=p_version
  returning projects.id,projects.name,projects.version,projects.updated_at;
$$;
comment on function public.rename_project is 'Atomically synchronizes display and serialized names with optimistic concurrency.';
