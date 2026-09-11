create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role in ('admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  phone text,
  address text,
  city text,
  category text,
  website text,
  latitude numeric,
  longitude numeric,
  source text not null default 'google_maps',
  source_id text,
  first_seen_at timestamptz not null default now(),
  prospected_at timestamptz,
  prospected_operation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  identity_type text not null check (
    identity_type in ('google_place_id', 'phone', 'domain', 'name_address')
  ),
  identity_value text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, identity_type, identity_value)
);

create table public.whatsapp_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  instance_name text not null,
  phone_number text,
  status text not null default 'disconnected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  niche text not null,
  city text not null,
  target_count integer not null check (target_count between 1 and 500),
  approval_mode text not null default 'automatic' check (
    approval_mode in ('automatic', 'human_review')
  ),
  message_template text not null,
  whatsapp_integration_id uuid references public.whatsapp_integrations(id),
  status text not null default 'scheduled' check (
    status in (
      'scheduled', 'searching', 'analyzing', 'generating', 'deploying',
      'awaiting_approval', 'sending', 'completed', 'failed', 'cancelled'
    )
  ),
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies
  add constraint companies_prospected_operation_fk
  foreign key (prospected_operation_id) references public.operations(id);

create table public.operation_companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'found',
  discard_reason text,
  score numeric,
  generated_site_url text,
  final_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, company_id)
);

create table public.prospecting_claims (
  company_id uuid primary key references public.companies(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

create table public.digital_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_company_id uuid not null references public.operation_companies(id) on delete cascade,
  result jsonb not null default '{}'::jsonb,
  score numeric,
  rules_version text not null,
  created_at timestamptz not null default now()
);

create table public.generated_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_company_id uuid not null references public.operation_companies(id) on delete cascade,
  model text not null,
  prompt_version text not null,
  artifact_path text,
  vercel_project_id text,
  vercel_deployment_id text,
  public_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_company_id uuid not null references public.operation_companies(id) on delete cascade,
  whatsapp_integration_id uuid references public.whatsapp_integrations(id),
  recipient text not null,
  content text not null,
  status text not null default 'pending',
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  operation_id uuid references public.operations(id) on delete cascade,
  operation_company_id uuid references public.operation_companies(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index companies_organization_idx on public.companies(organization_id);
create index operations_organization_created_idx
  on public.operations(organization_id, created_at desc);
create index operation_companies_operation_idx
  on public.operation_companies(operation_id);
create index events_operation_created_idx
  on public.events(operation_id, created_at);

create or replace function public.claim_company_for_prospecting(
  target_company_id uuid,
  target_operation_id uuid,
  target_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1
    from public.companies
    where id = target_company_id
      and organization_id = target_organization_id
      and prospected_at is null
  ) then
    return false;
  end if;

  insert into public.prospecting_claims (
    company_id,
    organization_id,
    operation_id
  )
  values (
    target_company_id,
    target_organization_id,
    target_operation_id
  )
  on conflict (company_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.companies enable row level security;
alter table public.company_identities enable row level security;
alter table public.whatsapp_integrations enable row level security;
alter table public.operations enable row level security;
alter table public.operation_companies enable row level security;
alter table public.prospecting_claims enable row level security;
alter table public.digital_analyses enable row level security;
alter table public.generated_sites enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

create policy "members can read organizations"
on public.organizations for select
using (public.is_organization_member(id));

create policy "members can read memberships"
on public.organization_members for select
using (public.is_organization_member(organization_id));

create policy "members can read companies"
on public.companies for select
using (public.is_organization_member(organization_id));

create policy "members can read company identities"
on public.company_identities for select
using (public.is_organization_member(organization_id));

create policy "members can read whatsapp integrations"
on public.whatsapp_integrations for select
using (public.is_organization_member(organization_id));

create policy "members can read operations"
on public.operations for select
using (public.is_organization_member(organization_id));

create policy "members can read operation companies"
on public.operation_companies for select
using (public.is_organization_member(organization_id));

create policy "members can read digital analyses"
on public.digital_analyses for select
using (public.is_organization_member(organization_id));

create policy "members can read generated sites"
on public.generated_sites for select
using (public.is_organization_member(organization_id));

create policy "members can read messages"
on public.messages for select
using (public.is_organization_member(organization_id));

create policy "members can read events"
on public.events for select
using (public.is_organization_member(organization_id));

alter publication supabase_realtime add table
  public.operations,
  public.operation_companies,
  public.events;
