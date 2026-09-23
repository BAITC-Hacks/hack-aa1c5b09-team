alter table needs add column updated_at timestamptz;
update needs set updated_at = created_at where updated_at is null;
alter table needs alter column updated_at set not null;
alter table needs add column category varchar(250);
alter table needs add column budget_text varchar(250);
alter table needs add column deadline_text varchar(250);
alter table needs add column work_format varchar(250);
alter table needs add column location varchar(250);
alter table needs add column requirements text;

create table chat_messages (
    id uuid primary key,
    proposal_id uuid not null references proposals(id) on delete cascade,
    sender_id uuid not null references users(id),
    sender_role varchar(20) not null check (sender_role in ('consumer', 'provider')),
    client_id uuid not null,
    message_text text not null,
    created_at timestamptz not null,
    unique (proposal_id, sender_id, client_id)
);
create index chat_messages_proposal_idx on chat_messages(proposal_id, created_at, id);
