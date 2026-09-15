create or replace function public.ticketing_block_closed_ticket_replies()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.support_tickets
    where id = new.ticket_id
      and status in ('done', 'expired')
  ) then
    raise exception 'This ticket is closed and can no longer receive replies.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists support_ticket_messages_block_closed_ticket_replies
  on public.support_ticket_messages;

create trigger support_ticket_messages_block_closed_ticket_replies
before insert on public.support_ticket_messages
for each row
execute function public.ticketing_block_closed_ticket_replies();

comment on function public.ticketing_block_closed_ticket_replies() is
  'Prevents customer, admin, internal, and integration replies after a ticket is done or expired.';
