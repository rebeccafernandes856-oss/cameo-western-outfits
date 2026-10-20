-- Run once in Supabase SQL Editor. Replace owner email only if your owner email differs.
create table if not exists public.site_settings (id integer primary key check(id=1), whatsapp_number text not null check(whatsapp_number ~ '^91[6-9][0-9]{9}$'));
insert into public.site_settings(id,whatsapp_number) values(1,'917506590090') on conflict(id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "Anyone reads contact settings" on public.site_settings;
create policy "Anyone reads contact settings" on public.site_settings for select to anon,authenticated using(true);
drop policy if exists "Only owner updates contact settings" on public.site_settings;
create policy "Only owner updates contact settings" on public.site_settings for update to authenticated using ((auth.jwt()->>'email')='rebeccafernandes856@gmail.com') with check ((auth.jwt()->>'email')='rebeccafernandes856@gmail.com');
grant select on public.site_settings to anon,authenticated;
grant update on public.site_settings to authenticated;
