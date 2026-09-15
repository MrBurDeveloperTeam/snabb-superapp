-- Priority changes are intentionally exposed through a narrow RPC. The browser
-- cannot use it to update any other ticket fields, and the database verifies
-- the caller's current admin profile before bypassing table RLS.

create or replace function public.ticketing_set_priority(
  p_ticket_id uuid,
  p_priority text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_priority text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.user_id = (select auth.uid())
      and p.account_type = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'Only administrators can change ticket priority.';
  end if;

  if p_priority not in ('0', '1', '2', '3') then
    raise exception using errcode = '22023', message = 'Invalid ticket priority.';
  end if;

  update public.support_tickets
  set priority = p_priority
  where id = p_ticket_id
  returning priority into v_priority;

  if not found then
    raise exception using errcode = 'P0002', message = 'Ticket not found.';
  end if;

  return v_priority;
end;
$$;

revoke all on function public.ticketing_set_priority(uuid, text) from public;
revoke all on function public.ticketing_set_priority(uuid, text) from anon;
grant execute on function public.ticketing_set_priority(uuid, text) to authenticated;

create or replace function public.ticketing_guard_priority_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.priority is distinct from new.priority
    and current_user not in ('postgres', 'service_role')
    and not exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_type = 'admin'
    )
  then
    raise exception using errcode = '42501', message = 'Only administrators can change ticket priority.';
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_guard_priority_update on public.support_tickets;
create trigger support_tickets_guard_priority_update
before update of priority on public.support_tickets
for each row execute function public.ticketing_guard_priority_update();

create or replace function public.ticketing_record_priority_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_name text;
begin
  if old.priority is not distinct from new.priority then
    return new;
  end if;

  select coalesce(p.full_name, p.name, p.email)
  into v_actor_name
  from public.profiles p
  where p.user_id = v_actor_id;

  insert into public.support_ticket_history (
    ticket_id,
    actor_id,
    actor_name,
    event_type,
    details
  ) values (
    new.id,
    v_actor_id,
    v_actor_name,
    'priority_changed',
    jsonb_build_object('previous_priority', old.priority, 'new_priority', new.priority)
  );

  return new;
end;
$$;

revoke all on function public.ticketing_guard_priority_update() from public, anon, authenticated;
revoke all on function public.ticketing_record_priority_change() from public, anon, authenticated;

drop trigger if exists support_tickets_record_priority_change on public.support_tickets;
create trigger support_tickets_record_priority_change
after update of priority on public.support_tickets
for each row execute function public.ticketing_record_priority_change();

drop policy if exists "ticket_participants_can_view_priority_history"
  on public.support_ticket_history;

create policy "ticket_participants_can_view_priority_history"
on public.support_ticket_history
for select
to authenticated
using (
  event_type = 'priority_changed'
  and exists (
    select 1
    from public.support_tickets
    where support_tickets.id = support_ticket_history.ticket_id
  )
);
