create table if not exists public.telegram_student_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  chat_id text not null unique,
  username text,
  enabled boolean not null default true,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create table if not exists public.telegram_link_codes (
  code text primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_student_idx on public.telegram_link_codes(student_id);
create index if not exists telegram_link_codes_expires_idx on public.telegram_link_codes(expires_at);

alter table public.telegram_student_links enable row level security;
alter table public.telegram_link_codes enable row level security;

create policy "Students can read own Telegram link" on public.telegram_student_links
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.get_my_class_id() = s.class_id));

create policy "Students can manage own Telegram link" on public.telegram_student_links
  for all to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.get_my_class_id() = s.class_id))
  with check (exists (select 1 from public.students s where s.id = student_id and public.get_my_class_id() = s.class_id));

create policy "Authenticated users can create Telegram link codes" on public.telegram_link_codes
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and public.get_my_class_id() = s.class_id));

create policy "Authenticated users can read own Telegram link codes" on public.telegram_link_codes
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and public.get_my_class_id() = s.class_id));
