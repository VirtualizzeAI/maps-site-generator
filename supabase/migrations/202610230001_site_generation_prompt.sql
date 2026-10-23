begin;

alter table public.integration_settings
  add column if not exists site_generation_prompt text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.integration_settings'::regclass
      and conname = 'integration_settings_site_prompt_length'
  ) then
    alter table public.integration_settings
      add constraint integration_settings_site_prompt_length
      check (char_length(site_generation_prompt) <= 20000);
  end if;
end;
$$;

comment on column public.integration_settings.site_generation_prompt is
  'Prompt de geração de sites por organização. Vazio usa o padrão do backend.';

commit;
