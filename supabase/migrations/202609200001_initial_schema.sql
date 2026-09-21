begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email));

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index memberships_user_id_idx on public.memberships(user_id);

-- Segredos de provedores permanecem no ambiente do backend. Esta tabela guarda
-- apenas opções não secretas e configurações operacionais por organização.
create table public.integration_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  openai_model text not null default 'gpt-5-mini',
  evolution_url text,
  evolution_instance text,
  whatsapp_test_mode boolean not null default false,
  whatsapp_test_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_test_number_required check (
    not whatsapp_test_mode or nullif(regexp_replace(coalesce(whatsapp_test_number, ''), '[^0-9]', '', 'g'), '') is not null
  )
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  phone text,
  other_phones text[] not null default '{}',
  email text,
  address text,
  city text,
  category text,
  website text,
  maps_url text,
  social_links text[] not null default '{}',
  source text not null default 'google_maps',
  source_id text,
  raw_data jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  prospected_at timestamptz,
  prospected_operation_id uuid,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index companies_organization_created_idx on public.companies(organization_id, created_at desc);
create index companies_active_idx on public.companies(organization_id) where archived_at is null;

create table public.company_identities (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null,
  identity text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, identity),
  foreign key (company_id, organization_id)
    references public.companies(id, organization_id) on delete cascade
);

create index company_identities_company_idx on public.company_identities(company_id);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  niche text not null,
  city text not null,
  target_count integer not null check (target_count between 1 and 500),
  approval_mode text not null check (approval_mode in ('automatic', 'human_review')),
  message_template text not null check (char_length(message_template) between 1 and 4000),
  status text not null default 'queued' check (status in (
    'queued', 'scheduled', 'searching', 'analyzing',
    'awaiting_approval', 'completed', 'failed'
  )),
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  found_count integer not null default 0 check (found_count >= 0),
  analyzed_count integer not null default 0 check (analyzed_count >= 0),
  generated_count integer not null default 0 check (generated_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  discarded_count integer not null default 0 check (discarded_count >= 0),
  blocked_count integer not null default 0 check (blocked_count >= 0),
  current_company_id uuid,
  current_company_name text,
  current_stage text,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (current_company_id, organization_id)
    references public.companies(id, organization_id) on delete set null (current_company_id)
);

create index operations_queue_idx on public.operations(status, scheduled_for, created_at)
  where archived_at is null;
create index operations_organization_created_idx on public.operations(organization_id, created_at desc);

alter table public.companies
  add constraint companies_prospected_operation_fk
  foreign key (prospected_operation_id, organization_id)
  references public.operations(id, organization_id) on delete set null (prospected_operation_id);

create table public.operation_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid not null,
  company_id uuid not null,
  status text not null default 'found',
  discard_reason text,
  score integer check (score between 0 and 100),
  generated_site_url text,
  final_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, company_id),
  unique (id, organization_id),
  foreign key (operation_id, organization_id)
    references public.operations(id, organization_id) on delete cascade,
  foreign key (company_id, organization_id)
    references public.companies(id, organization_id) on delete restrict
);

create index operation_companies_operation_idx on public.operation_companies(operation_id, created_at);
create index operation_companies_company_idx on public.operation_companies(company_id, created_at desc);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_company_id uuid not null,
  provider text not null default 'vercel',
  deployment_id text,
  public_url text not null,
  status text not null default 'ready' check (status in ('creating', 'ready', 'failed', 'archived')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_company_id),
  foreign key (operation_company_id, organization_id)
    references public.operation_companies(id, organization_id) on delete cascade
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_company_id uuid not null,
  recipient text not null,
  delivered_to text,
  test_mode boolean not null default false,
  content text not null,
  status text not null check (status in ('pending_approval', 'sending', 'sent', 'failed')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  provider_message_id text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (operation_company_id, organization_id)
    references public.operation_companies(id, organization_id) on delete cascade
);

create index messages_organization_status_idx on public.messages(organization_id, status, created_at desc);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid,
  operation_company_id uuid,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (operation_id, organization_id)
    references public.operations(id, organization_id) on delete cascade,
  foreign key (operation_company_id, organization_id)
    references public.operation_companies(id, organization_id) on delete cascade
);

create index events_organization_created_idx on public.events(organization_id, created_at desc);
create index events_operation_idx on public.events(operation_id, created_at);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'profiles', 'memberships', 'integration_settings',
    'companies', 'operations', 'operation_companies', 'sites', 'messages'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create table private.bootstrap_admins (
  email text primary key,
  organization_name text not null,
  consumed_at timestamptz
);

insert into private.bootstrap_admins(email, organization_name)
values ('virtualizzeautomacao@gmail.com', 'Virtualizze Automação')
on conflict (email) do update
set organization_name = excluded.organization_name;

create or replace function private.bootstrap_user(
  p_user_id uuid,
  p_user_email text,
  p_user_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap private.bootstrap_admins%rowtype;
  organization_id uuid;
begin
  if p_user_email is null then
    return;
  end if;

  insert into public.profiles(id, name, email)
  values (
    p_user_id,
    coalesce(nullif(trim(p_user_name), ''), split_part(p_user_email, '@', 1)),
    lower(p_user_email)
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email;

  select * into bootstrap
  from private.bootstrap_admins
  where email = lower(p_user_email)
  for update;

  if found and not exists (
    select 1 from public.memberships where memberships.user_id = p_user_id
  ) then
    insert into public.organizations(name)
    values (bootstrap.organization_name)
    returning id into organization_id;

    insert into public.memberships(organization_id, user_id, role)
    values (organization_id, p_user_id, 'admin');

    insert into public.integration_settings(organization_id)
    values (organization_id);

    update private.bootstrap_admins
    set consumed_at = now()
    where email = bootstrap.email;
  end if;
end;
$$;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.bootstrap_user(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function private.handle_new_auth_user();

-- Atende também ao caso em que o usuário tenha sido criado antes da migration.
do $$
declare
  existing_user record;
begin
  for existing_user in
    select id, email, raw_user_meta_data
    from auth.users
    where lower(email) = 'virtualizzeautomacao@gmail.com'
  loop
    perform private.bootstrap_user(
      existing_user.id,
      existing_user.email,
      coalesce(existing_user.raw_user_meta_data ->> 'name', existing_user.raw_user_meta_data ->> 'full_name', '')
    );
  end loop;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.integration_settings enable row level security;
alter table public.companies enable row level security;
alter table public.company_identities enable row level security;
alter table public.operations enable row level security;
alter table public.operation_companies enable row level security;
alter table public.sites enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- O frontend não acessa tabelas diretamente. Sem policies, anon/authenticated
-- permanecem bloqueados; o backend usa exclusivamente sua credencial secreta.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

comment on schema private is 'Objetos internos indisponíveis pela Data API';
comment on table public.company_identities is 'Identidades imutáveis usadas para impedir prospecção duplicada';
comment on table public.events is 'Trilha de auditoria append-only da aplicação';

commit;
