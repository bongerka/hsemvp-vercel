create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  patient_name text,
  phone text,
  telegram_username text,
  source text not null check (source in ('telegram', 'web')),
  service_interest text,
  desired_date text,
  notes text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('telegram', 'web')),
  external_user_id text,
  patient_name text,
  telegram_username text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message_text text,
  message_type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  original_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  actor_type text,
  actor_id text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads(status);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists conversations_source_external_idx on public.conversations(source, external_user_id);
create index if not exists messages_conversation_created_at_idx on public.messages(conversation_id, created_at desc);
create index if not exists knowledge_documents_category_idx on public.knowledge_documents(category);
create index if not exists knowledge_chunks_document_idx on public.knowledge_chunks(document_id);
create index if not exists event_logs_event_name_created_at_idx on public.event_logs(event_name, created_at desc);

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'admin'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  category_filter text default null
)
returns table (
  id uuid,
  document_id uuid,
  title text,
  category text,
  chunk_text text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
set search_path = public
as $$
  select
    kc.id,
    kc.document_id,
    kd.title,
    kd.category,
    kc.chunk_text,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_documents kd on kd.id = kc.document_id
  where category_filter is null or kd.category = category_filter
  order by kc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select on public.leads to authenticated;
grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant select on public.event_logs to authenticated;
grant select on public.knowledge_documents to authenticated;
grant select on public.knowledge_chunks to authenticated;
grant execute on function public.match_knowledge_chunks(vector, int, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.event_logs enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
  on public.leads
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "conversations_admin_read" on public.conversations;
create policy "conversations_admin_read"
  on public.conversations
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "messages_admin_read" on public.messages;
create policy "messages_admin_read"
  on public.messages
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "event_logs_admin_read" on public.event_logs;
create policy "event_logs_admin_read"
  on public.event_logs
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "knowledge_documents_admin_read" on public.knowledge_documents;
create policy "knowledge_documents_admin_read"
  on public.knowledge_documents
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "knowledge_chunks_admin_read" on public.knowledge_chunks;
create policy "knowledge_chunks_admin_read"
  on public.knowledge_chunks
  for select
  to authenticated
  using (public.is_admin());
