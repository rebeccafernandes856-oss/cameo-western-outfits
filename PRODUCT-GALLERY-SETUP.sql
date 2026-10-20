alter table public.products add column if not exists images text[] not null default '{}';
