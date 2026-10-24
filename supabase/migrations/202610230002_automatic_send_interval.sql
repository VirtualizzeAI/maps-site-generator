begin;

alter table public.integration_settings
  add column if not exists automatic_send_interval_seconds integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.integration_settings'::regclass
      and conname = 'integration_settings_automatic_send_interval_range'
  ) then
    alter table public.integration_settings
      add constraint integration_settings_automatic_send_interval_range
      check (automatic_send_interval_seconds between 0 and 3600);
  end if;
end;
$$;

comment on column public.integration_settings.automatic_send_interval_seconds is
  'Tempo mínimo entre envios automáticos bem-sucedidos da organização, em segundos. Zero desativa a espera.';

commit;
