begin;
alter table public.operations add column if not exists analysis_mode text not null default 'standard'
  check (analysis_mode in ('standard','advanced'));
alter table public.operations add column if not exists analysis_model text
  check (analysis_model in ('gpt-6-luna','gpt-6.1-sol','gpt-6-astra'));
alter table public.operation_companies add column if not exists advanced_analysis jsonb;
commit;
