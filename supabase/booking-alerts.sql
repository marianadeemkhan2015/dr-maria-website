-- Booking alerts: run once in Supabase → SQL Editor AFTER schema.sql.
-- Replace YOUR-SITE and YOUR-PUSH-SECRET (same value as PUSH_SECRET in Vercel).
create extension if not exists pg_net with schema extensions;

create table if not exists push_subscriptions (
  endpoint text primary key, p256dh text not null, auth text not null,
  user_id uuid default auth.uid(), created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "admin manage push" on push_subscriptions;
create policy "admin manage push" on push_subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function notify_new_booking() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare subs json; waiting int; clinic_name text;
begin
  if public.is_admin() then return new; end if;            -- walk-ins added by the doctor: no alert
  select json_agg(json_build_object('endpoint', endpoint, 'keys', json_build_object('p256dh', p256dh, 'auth', auth)))
    into subs from push_subscriptions;
  if subs is null then return new; end if;
  select count(*) into waiting from appointments where status = 'pending' and day >= pk_today();
  select name into clinic_name from clinics where id = new.clinic_id;
  perform net.http_post(
    url     := 'https://YOUR-SITE/api/push',
    body    := jsonb_build_object('subs', subs, 'pending', waiting, 'name', new.patient_name,
                                  'day', new.day, 'time', new.time, 'video', new.clinic_id is null, 'clinic', clinic_name),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', 'YOUR-PUSH-SECRET'));
  return new;
exception when others then
  return new;                                                -- an alert problem must never stop a booking
end $$;

drop trigger if exists booking_alert on appointments;
create trigger booking_alert after insert on appointments for each row execute function notify_new_booking();
