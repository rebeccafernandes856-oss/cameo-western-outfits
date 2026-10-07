-- CAMEO ADMIN DATABASE FIX V12
-- Run this entire file in Supabase > SQL Editor > New query > Run.

-- Make sure products table accepts the current 8 categories (including Skirts).
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check check (
  category in ('Dresses','Tops','Tshirts','Jumpsuits','Two-pc set','Nightsuits','Skirts','Bottoms')
);

-- If old rows still say Denims, convert them.
update public.products set category='Skirts' where category='Denims';

alter table public.products enable row level security;
drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products for select to anon, authenticated using (true);
drop policy if exists "Authenticated owner can insert products" on public.products;
create policy "Authenticated owner can insert products" on public.products for insert to authenticated with check (true);
drop policy if exists "Authenticated owner can update products" on public.products;
create policy "Authenticated owner can update products" on public.products for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated owner can delete products" on public.products;
create policy "Authenticated owner can delete products" on public.products for delete to authenticated using (true);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;

insert into storage.buckets (id,name,public) values ('product-images','product-images',true)
on conflict(id) do update set public=true;
