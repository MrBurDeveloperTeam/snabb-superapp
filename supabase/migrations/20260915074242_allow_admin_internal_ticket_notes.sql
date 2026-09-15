-- Internal notes are written directly from the authenticated admin dashboard.
-- Public replies continue to use the ticketing mail Worker and are intentionally
-- excluded from this browser-facing policy.

drop policy if exists "support_ticket_messages_admin_insert_internal_notes"
  on public.support_ticket_messages;

create policy "support_ticket_messages_admin_insert_internal_notes"
on public.support_ticket_messages
for insert
to authenticated
with check (
  is_internal is true
  and author_id = (select auth.uid())
  and exists (
    select 1
    from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.account_type = 'admin'
  )
  and exists (
    select 1
    from public.support_tickets
    where support_tickets.id = support_ticket_messages.ticket_id
      and support_tickets.status not in ('done', 'expired')
  )
);

comment on policy "support_ticket_messages_admin_insert_internal_notes"
  on public.support_ticket_messages is
  'Allows authenticated admins to add internal notes to open tickets without exposing public reply inserts to the browser.';
