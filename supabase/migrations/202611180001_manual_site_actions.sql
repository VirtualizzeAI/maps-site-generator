begin;
alter table public.operation_companies add column if not exists requested_action text check (requested_action in ('site_only','site_and_outreach'));
alter table public.operation_companies add column if not exists requested_by uuid references public.profiles(id) on delete set null;
commit;
