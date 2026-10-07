-- Run this in Supabase SQL Editor if you already ran the older V9 schema.
-- It updates the category constraint and converts existing Denims products to Skirts.

alter table public.products drop constraint if exists products_category_check;
update public.products set category = 'Skirts' where category = 'Denims';
alter table public.products add constraint products_category_check check (category in ('Dresses','Tops','Tshirts','Jumpsuits','Two-pc set','Nightsuits','Skirts','Bottoms'));

-- Optional: rename existing skirt-category products.
with names as (
  select id, row_number() over (order by created_at, id) rn from public.products where category='Skirts'
), labels(rn, name) as (values
(1,'Pleated Midi Skirt'),(2,'Satin Evening Skirt'),(3,'Floral Day Skirt'),(4,'Classic A-Line Skirt'),(5,'Chic Mini Skirt'),(6,'Flowy Maxi Skirt'),(7,'High-Waist Midi Skirt'),(8,'Weekend Wrap Skirt'),(9,'Soft Pleated Skirt'),(10,'City Mini Skirt'),(11,'Everyday A-Line Skirt'),(12,'Statement Maxi Skirt'),(13,'Brunch Ready Skirt'),(14,'Modern Midi Skirt'),(15,'Elegant Flare Skirt'),(16,'Classic Wrap Skirt'),(17,'Cameo Signature Skirt')
)
update public.products p set name=l.name from names n join labels l using(rn) where p.id=n.id;
