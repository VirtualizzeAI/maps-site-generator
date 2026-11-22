begin;
create table if not exists public.prospecting_operations (
 id uuid primary key, organization_id uuid not null references public.organizations(id) on delete cascade,
 created_by uuid not null references public.profiles(id) on delete restrict,
 niche text not null,city text not null,target_count integer not null check(target_count between 1 and 30),
 collect_linkedin boolean not null,collect_contacts boolean not null,check(collect_linkedin or collect_contacts),
 model text not null check(model in ('gpt-6-luna','gpt-6.1-sol','gpt-6-astra')),
 status text not null check(status in ('queued','searching','analyzing','completed','failed')),
 found_count integer not null default 0,analyzed_count integer not null default 0,duplicate_count integer not null default 0,
 current_company text,error_message text,discovery_usage jsonb,created_at timestamptz not null,updated_at timestamptz not null,started_at timestamptz,finished_at timestamptz,
 unique(id,organization_id)
);
create table if not exists public.prospecting_results (
 id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,
 operation_id uuid not null,company_key text not null,name text not null,city text not null,address text,website text,source_url text not null,
 status text not null check(status in ('pending','completed','inconclusive')),report jsonb,usage jsonb,
 created_at timestamptz not null,updated_at timestamptz not null,
 foreign key(operation_id,organization_id) references public.prospecting_operations(id,organization_id) on delete cascade,
 unique(operation_id,company_key)
);
create index if not exists prospecting_operations_org_created on public.prospecting_operations(organization_id,created_at desc);
create index if not exists prospecting_results_operation on public.prospecting_results(operation_id);
alter table public.prospecting_operations enable row level security;
alter table public.prospecting_results enable row level security;
revoke all on public.prospecting_operations,public.prospecting_results from anon,authenticated;
commit;
