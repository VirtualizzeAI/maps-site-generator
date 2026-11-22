begin;
alter table public.prospecting_results add constraint prospecting_results_id_org_unique unique(id,organization_id);
create table public.prospecting_boards (
 id uuid primary key,organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),created_by uuid not null references public.profiles(id) on delete restrict,
 deleted_at timestamptz,created_at timestamptz not null,updated_at timestamptz not null,
 unique(id,organization_id)
);
create table public.prospecting_stages (
 id uuid primary key,organization_id uuid not null,board_id uuid not null,
 name text not null check(length(trim(name)) between 1 and 80),position integer not null check(position>=0),
 deleted_at timestamptz,created_at timestamptz not null,updated_at timestamptz not null,
 foreign key(board_id,organization_id) references public.prospecting_boards(id,organization_id) on delete cascade,
 unique(id,board_id,organization_id)
);
create table public.prospecting_cards (
 id uuid primary key,organization_id uuid not null,board_id uuid not null,stage_id uuid not null,result_id uuid not null,
 company_key text not null,created_by uuid not null references public.profiles(id) on delete restrict,
 deleted_at timestamptz,created_at timestamptz not null,updated_at timestamptz not null,
 foreign key(board_id,organization_id) references public.prospecting_boards(id,organization_id) on delete cascade,
 foreign key(stage_id,board_id,organization_id) references public.prospecting_stages(id,board_id,organization_id),
 foreign key(result_id,organization_id) references public.prospecting_results(id,organization_id) on delete cascade
);
create unique index prospecting_cards_active_company on public.prospecting_cards(board_id,company_key) where deleted_at is null;
create index prospecting_boards_org on public.prospecting_boards(organization_id) where deleted_at is null;
create index prospecting_stages_board on public.prospecting_stages(board_id,position) where deleted_at is null;
create index prospecting_cards_board on public.prospecting_cards(board_id,stage_id) where deleted_at is null;
alter table public.prospecting_boards enable row level security;
alter table public.prospecting_stages enable row level security;
alter table public.prospecting_cards enable row level security;
revoke all on public.prospecting_boards,public.prospecting_stages,public.prospecting_cards from anon,authenticated;
commit;
