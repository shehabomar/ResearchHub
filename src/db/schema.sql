-- users
create table if not exists users (
    id serial primary key,
    first_name varchar(100),
    second_name varchar(100),
    email varchar(255) unique not null,
    password varchar(255) not null,
    created_at timestamp with time zone default now()
);

-- papers
create table if not exists papers (
    id varchar(255) primary key,
    title text not null,
    abstract text,
    authors jsonb,
    publication_date date,
    citation_count integer default 0,
    api_source varchar(50),
    external_ids jsonb,
    meta_data jsonb,
    created_at timestamp with time zone default now()
);

-- exploration_session
create table if not exists exploration_session (
    id serial primary key, 
    user_id integer references users(id) on delete cascade,
    name varchar(255),
    description text,
    meta_data jsonb,
    is_shared boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- exploration path types
drop type if exists exploration_types cascade;
create type exploration_types as enum (
    'search', 
    'citation', 
    'reference', 
    'author', 
    'similar'
);

-- exploration_path
create table if not exists exploration_path (
    id serial primary key,
    session_id integer references exploration_session(id) on delete cascade,
    parent_path_id integer references exploration_path(id) on delete cascade,
    paper_id varchar(255) references papers(id) on delete cascade,
    depth integer not null default 0,
    exploration_type exploration_types not null,
    path_meta_data jsonb,
    created_at timestamp with time zone default now()
);



-- indexes
create index if not exists idx_papers_title on papers using gin(to_tsvector('english', title));
create index if not exists idx_papers_abstract on papers using gin(to_tsvector('english', abstract1`));

create index if not exists idx_exploration_path_session on exploration_path(session_id);
create index if not exists idx_exploration_path_tree on exploration_path(session_id, parent_path_id);
create index if not exists idx_exploration_path_paper on exploration_path(paper_id);

create index if not exists idx_sessions_user on exploration_session(user_id);

create index if not exists idx_user_id on users(id);
create index if not exists idx_user_email on users(email);