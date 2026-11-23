begin;
alter table public.integration_settings add column if not exists prospecting_prompt text;
alter table public.integration_settings add constraint integration_settings_prospecting_prompt_length
 check(prospecting_prompt is null or length(trim(prospecting_prompt)) between 20 and 20000);
commit;
