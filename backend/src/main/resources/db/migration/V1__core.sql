create table users (
    id uuid primary key,
    email varchar(254) not null unique,
    password_hash varchar(100) not null,
    display_name varchar(100) not null,
    created_at timestamptz not null,
    constraint normalized_email check (email = lower(trim(email)))
);

create table needs (
    id uuid primary key,
    owner_id uuid not null references users(id),
    original_description text,
    title varchar(200),
    problem text,
    expected_result text,
    constraints_text text,
    budget_amount numeric(14, 2),
    currency varchar(3),
    deadline date,
    status varchar(30) not null check (status in ('DRAFT', 'PUBLISHED', 'SOLUTION_SELECTED')),
    created_at timestamptz not null,
    selected_proposal_id uuid,
    version bigint not null default 0,
    constraint valid_budget check (budget_amount is null or (budget_amount >= 0 and currency is not null)),
    constraint selection_matches_status check ((status = 'SOLUTION_SELECTED') = (selected_proposal_id is not null))
);

create index needs_catalog_idx on needs(status, created_at desc, id desc);
create index needs_owner_idx on needs(owner_id, created_at desc, id desc);

create table need_acceptance_criteria (
    need_id uuid not null references needs(id) on delete cascade,
    position integer not null,
    criterion varchar(500) not null,
    primary key (need_id, position)
);

create table proposals (
    id uuid primary key,
    need_id uuid not null references needs(id),
    author_id uuid not null references users(id),
    solution_description text not null,
    implementation_plan text not null,
    expected_result text not null,
    price_amount numeric(14, 2),
    currency varchar(3),
    price_note text,
    duration_days integer,
    schedule_note text,
    status varchar(20) not null check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
    created_at timestamptz not null,
    unique (need_id, author_id),
    unique (need_id, id),
    constraint valid_price check (price_amount is null or (price_amount >= 0 and currency is not null)),
    constraint price_terms_present check (price_amount is not null or coalesce(length(trim(price_note)), 0) > 0),
    constraint valid_duration check (duration_days is null or duration_days between 1 and 3650),
    constraint schedule_terms_present check (duration_days is not null or coalesce(length(trim(schedule_note)), 0) > 0)
);

create unique index one_accepted_proposal_per_need on proposals(need_id) where status = 'ACCEPTED';
create index proposals_author_idx on proposals(author_id, created_at desc, id desc);
create index proposals_need_idx on proposals(need_id, created_at desc, id desc);

alter table needs add constraint selected_proposal_belongs_to_need
    foreign key (id, selected_proposal_id) references proposals(need_id, id);
