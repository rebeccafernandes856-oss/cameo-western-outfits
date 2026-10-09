-- Run ONCE in Supabase SQL Editor before using Manage Categories.
create table if not exists public.categories (name text primary key,sort_order integer not null default 0);
insert into public.categories(name,sort_order) values ('Dresses',0),('Tops',1),('Tshirts',2),('Jumpsuits',3),('Two-pc set',4),('Nightsuits',5),('Skirts',6),('Bottoms',7) on conflict(name) do nothing;
insert into public.categories(name) select distinct category from public.products on conflict(name) do nothing;
alter table public.categories enable row level security;
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select to anon,authenticated using(true);
drop policy if exists "Authenticated manage categories" on public.categories;
create policy "Authenticated manage categories" on public.categories for all to authenticated using(true) with check(true);
-- Remove old hardcoded product category constraint so custom categories can be saved.
alter table public.products drop constraint if exists products_category_check;
-- Rename category cascades to products through database trigger.
create or replace function public.cameo_rename_category_products() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.name <> old.name then update public.products set category=new.name where category=old.name; end if; return new; end $$;
drop trigger if exists cameo_category_rename on public.categories;
create trigger cameo_category_rename after update of name on public.categories for each row execute function public.cameo_rename_category_products();

-- Enable custom category cover images.
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists image_path text;
