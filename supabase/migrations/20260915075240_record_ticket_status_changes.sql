-- Status transitions are already recorded by record_support_ticket_changes().
-- Expose only those lifecycle events to authenticated ticket participants so
-- the shared customer/admin conversation can render them safely.

alter table public.support_ticket_history enable row level security;

grant select on table public.support_ticket_history to authenticated;

drop policy if exists "ticket_participants_can_view_status_history"
  on public.support_ticket_history;

create policy "ticket_participants_can_view_status_history"
on public.support_ticket_history
for select
to authenticated
using (
  event_type = 'status_changed'
  and exists (
    select 1
    from public.support_tickets
    where support_tickets.id = support_ticket_history.ticket_id
  )
);
