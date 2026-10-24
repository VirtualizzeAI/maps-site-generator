begin;
alter table public.operation_companies
  add column if not exists site_generation_usage jsonb;
comment on column public.operation_companies.site_generation_usage is
  'Uso retornado pela OpenAI e estimativa USD com tarifas congeladas. NULL significa ausência de registro histórico.';
commit;
