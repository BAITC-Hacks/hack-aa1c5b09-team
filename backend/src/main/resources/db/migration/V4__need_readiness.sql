alter table needs
    add column materials text,
    add column target_users text,
    add column business_contact varchar(500),
    add column consultation_format text,
    add column feedback_procedure text,
    add column readiness_score integer not null default 0 check (readiness_score between 0 and 100);

-- Existing data remains unconfirmed: migration does not invent owner confirmations.
create table need_readiness_confirmations (
    need_id uuid not null references needs(id) on delete cascade,
    criterion varchar(30) not null check (criterion in
        ('CONTEXT', 'MATERIALS', 'RESULT', 'SUCCESS', 'CONSTRAINTS', 'USERS', 'BUSINESS')),
    primary key (need_id, criterion)
);

create index needs_readiness_catalog_idx on needs (
    (case when readiness_score >= 90 then 2 when readiness_score >= 70 then 1 else 0 end) desc,
    created_at desc, id desc
) where status = 'PUBLISHED';
