alter table public.support_tickets
  add column if not exists recipient_email text;

comment on column public.support_tickets.recipient_email is
  'Original validated recipient for email-ingested tickets.';

create or replace function public.enforce_support_ticket_email_recipient()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source = 'email'
     and lower(trim(coalesce(new.recipient_email, ''))) <> 'support@snabbb.com' then
    raise exception using
      errcode = '23514',
      message = 'Email tickets must be verified as addressed to support@snabbb.com.';
  end if;

  return new;
end;
$$;

drop trigger if exists support_tickets_enforce_email_recipient
  on public.support_tickets;

create trigger support_tickets_enforce_email_recipient
before insert on public.support_tickets
for each row
execute function public.enforce_support_ticket_email_recipient();
