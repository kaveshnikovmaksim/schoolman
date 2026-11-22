create table if not exists public.telegram_class_links (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  chat_id text not null,
  username text,
  enabled boolean not null default true,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, chat_id)
);
create index if not exists telegram_class_links_chat_idx on public.telegram_class_links(chat_id);
alter table public.telegram_class_links enable row level security;
create policy "Class members can read Telegram links" on public.telegram_class_links for select to authenticated using (public.can_access_class(class_id));
create policy "Class members can manage Telegram links" on public.telegram_class_links for all to authenticated using (public.can_access_class(class_id)) with check (public.can_access_class(class_id));
