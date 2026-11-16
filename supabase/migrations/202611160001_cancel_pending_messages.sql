begin;
alter table public.messages drop constraint if exists messages_status_check;
alter table public.messages add constraint messages_status_check
  check (status in ('pending_approval', 'sending', 'sent', 'failed', 'cancelled'));
commit;
