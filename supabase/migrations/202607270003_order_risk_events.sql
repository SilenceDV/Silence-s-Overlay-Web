create or replace function public.set_subscription_suspension(
  p_customer_id text,
  p_suspended boolean,
  p_event_created bigint,
  p_event_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update subscriptions
  set suspended = p_suspended,
      last_event_created = p_event_created,
      last_stripe_event_id = p_event_id,
      updated_at = now()
  where stripe_customer_id = p_customer_id
    and (
      last_event_created is null
      or p_event_created > last_event_created
      or (
        p_event_created = last_event_created
        and p_suspended
        and not suspended
      )
    );
end
$$;

comment on function public.set_subscription_suspension is
  'Atomically applies Stripe risk events in timestamp order; suspension wins ties.';

revoke all on function public.set_subscription_suspension(text, boolean, bigint, text) from public;
grant execute on function public.set_subscription_suspension(text, boolean, bigint, text) to service_role;
