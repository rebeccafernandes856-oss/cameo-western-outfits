-- Cameo Western Outfits: Supabase database + RLS + Storage
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Dresses','Tops','Tshirts','Jumpsuits','Two-pc set','Nightsuits','Skirts','Bottoms')),
  price numeric(10,2),
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  image_url text,
  image_path text,
  in_stock boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products
for select to anon, authenticated using (true);

drop policy if exists "Authenticated owner can insert products" on public.products;
create policy "Authenticated owner can insert products" on public.products
for insert to authenticated with check (true);

drop policy if exists "Authenticated owner can update products" on public.products;
create policy "Authenticated owner can update products" on public.products
for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated owner can delete products" on public.products;
create policy "Authenticated owner can delete products" on public.products
for delete to authenticated using (true);

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;

insert into storage.buckets (id, name, public)
values ('product-images','product-images',true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to public using (bucket_id = 'product-images');

drop policy if exists "Authenticated owner can upload product images" on storage.objects;
create policy "Authenticated owner can upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "Authenticated owner can update product images" on storage.objects;
create policy "Authenticated owner can update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

drop policy if exists "Authenticated owner can delete product images" on storage.objects;
create policy "Authenticated owner can delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images');
