create table if not exists public.telegram_class_link_codes (
  code text primary key,
  class_id uuid not null references public.classes(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.telegram_class_link_codes enable row level security;
create policy "Class accounts can create Telegram class codes" on public.telegram_class_link_codes
  for insert to authenticated with check (class_id = public.get_my_class_id());
create policy "Class accounts can read Telegram class codes" on public.telegram_class_link_codes
  for select to authenticated using (class_id = public.get_my_class_id());
