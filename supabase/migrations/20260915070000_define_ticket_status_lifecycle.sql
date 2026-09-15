-- Current App.Snabbb ticket lifecycle. This replaces the former message-status
-- behavior and does not depend on any Odoo scheduled action.

create or replace function public.handle_support_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  author_is_admin boolean := false;
begin
  if new.author_id is not null then
    select coalesce(p.account_type = 'admin', false)
      into author_is_admin
    from public.profiles p
    where p.user_id = new.author_id;
  end if;

  author_is_admin := coalesce(author_is_admin, false);

  -- Internal notes are deliberately excluded from every status and activity
  -- timestamp transition.
  if not new.is_internal then
    if author_is_admin then
      update public.support_tickets
      set
        status = case
          when status in ('done', 'expired') then status
          else 'replied'
        end,
        first_response_at = coalesce(first_response_at, now()),
        replied_at = now(),
        last_activity_at = now(),
        last_gmail_message_id = coalesce(new.gmail_message_id, last_gmail_message_id)
      where id = new.ticket_id;
    else
      update public.support_tickets
      set
        status = case
          when status in ('done', 'expired') then status
          when status = 'replied' then 'waiting'
          else status
        end,
        last_activity_at = now(),
        last_gmail_message_id = coalesce(new.gmail_message_id, last_gmail_message_id)
      where id = new.ticket_id;
    end if;
  end if;

  insert into public.support_ticket_history (
    ticket_id,
    actor_id,
    actor_name,
    event_type,
    details
  )
  values (
    new.ticket_id,
    new.author_id,
    new.author_name,
    case
      when new.is_internal then 'internal_note_added'
      when author_is_admin then 'admin_replied'
      when new.source = 'gmail' then 'gmail_reply_received'
      else 'customer_replied'
    end,
    jsonb_build_object(
      'message_id', new.id,
      'source', new.source,
      'direction', new.direction,
      'gmail_message_id', new.gmail_message_id
    )
  );

  return new;
end;
$$;

create or replace function public.ticketing_close_stale_tickets()
returns table(expired_count bigint, done_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_rows bigint := 0;
  done_rows bigint := 0;
begin
  -- No public admin response within two days of ticket creation.
  update public.support_tickets
  set status = 'expired'
  where status = 'request'
    and first_response_at is null
    and created_at <= now() - interval '2 days';
  get diagnostics expired_rows = row_count;

  -- The most recent public participant was the admin. A customer response would
  -- already have moved the ticket from replied to waiting.
  update public.support_tickets
  set status = 'done'
  where status = 'replied'
    and replied_at is not null
    and replied_at <= now() - interval '2 days';
  get diagnostics done_rows = row_count;

  return query select expired_rows, done_rows;
end;
$$;

comment on function public.ticketing_close_stale_tickets() is
  'Expires unanswered requests and completes admin-replied tickets after two days.';

-- Replace this app-owned schedule safely when the migration is re-applied.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
  from cron.job
  where jobname = 'ticketing-close-stale-tickets'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ticketing-close-stale-tickets',
    '*/15 * * * *',
    'select public.ticketing_close_stale_tickets();'
  );
end;
$$;
