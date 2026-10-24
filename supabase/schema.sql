-- =====================================================================
-- Doctor website database (Supabase / PostgreSQL)
-- Run this whole file once in Supabase: SQL Editor -> New query -> Run.
-- Safe to re-run: it creates what is missing and replaces functions.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Site settings (one row) ----------
create table if not exists settings (
  id              int primary key default 1 check (id = 1),
  doctor_name     text not null default 'Dr. Maria Nadeem Khan',
  specialty       text not null default 'Clinical Nutritionist',
  degrees         text not null default 'MSc Nutrition',
  pmdc_number     text,           -- optional: shown as a badge only when filled in
  bio_en          text not null default '',
  bio_ur          text not null default '',
  photo_url       text,
  years           int  not null default 15,
  stat_patients   text not null default '10,000+',
  stat_papers     text not null default '50+',
  stat_extra_label text not null default 'Research papers',
  languages       text not null default 'English · اردو · Punjabi',
  clinic_name     text not null default '',
  clinic_address  text not null default '',
  clinic_hours    text not null default '',
  map_link        text,
  whatsapp        text not null default '',
  email           text,
  facebook        text,
  instagram       text,
  tiktok          text,
  youtube         text,
  clinic_fee      int  not null default 2500,
  video_fee       int  not null default 2000,
  followup_fee    int  not null default 1000,
  payment_note    text not null default 'Send the exact fee, then attach a screenshot of the payment receipt below. The clinic confirms your booking after checking it.',
  jazzcash        text,           -- mobile account number
  jazzcash_title  text,           -- account holder name
  easypaisa       text,
  easypaisa_title text,
  bank_name       text,
  bank_title      text,
  bank_account    text,
  bank_iban       text,
  slot_minutes    int  not null default 30 check (slot_minutes between 10 and 120),
  booking_days    int  not null default 21 check (booking_days between 1 and 90),
  booking_open    boolean not null default true,
  video_open      boolean not null default true,
  services_title  text not null default 'Services & fees',
  services_intro  text not null default '',
  events_title    text not null default 'Events, camps & knowledge-based videos',
  show_events     boolean not null default true,
  show_articles   boolean not null default true,
  show_reviews    boolean not null default true,
  phone                text,
  footer_clinics_title text not null default 'Clinics',
  footer_contact_title text not null default 'Contact',
  footer_timings_text  text not null default 'See timings',
  footer_qr_title      text not null default 'Scan to book',
  footer_qr_text       text not null default 'Print this on prescriptions and clinic boards.',
  footer_note          text not null default '',
  show_footer_clinics  boolean not null default true,
  show_footer_qr       boolean not null default true,
  updated_at      timestamptz not null default now()
);
insert into settings (id) values (1) on conflict do nothing;
alter table settings add column if not exists pmdc_number text;
alter table settings add column if not exists phone text;
alter table settings add column if not exists footer_clinics_title text not null default 'Clinics';
alter table settings add column if not exists footer_contact_title text not null default 'Contact';
alter table settings add column if not exists footer_timings_text text not null default 'See timings';
alter table settings add column if not exists footer_qr_title text not null default 'Scan to book';
alter table settings add column if not exists footer_qr_text text not null default 'Print this on prescriptions and clinic boards.';
alter table settings add column if not exists footer_note text not null default '';
update settings set footer_note = '' where footer_note like 'Online consultations do not replace emergency care%';
alter table settings add column if not exists show_footer_clinics boolean not null default true;
alter table settings add column if not exists show_footer_qr boolean not null default true;
alter table settings add column if not exists tiktok text;
alter table settings add column if not exists events_title text not null default 'Events, camps & knowledge-based videos';
alter table settings add column if not exists services_title text not null default 'Services & fees';
alter table settings add column if not exists services_intro text not null default '';
alter table settings add column if not exists jazzcash_title text;
alter table settings add column if not exists easypaisa_title text;
alter table settings add column if not exists bank_name text;
alter table settings add column if not exists bank_title text;
alter table settings add column if not exists bank_account text;
alter table settings add column if not exists bank_iban text;

-- ---------- Who may edit (the doctor and staff) ----------
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note    text
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ---------- Content ----------
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null default '',
  fee_note    text not null default '',   -- e.g. "Clinic or video"
  fee         int,                         -- optional price in PKR
  image_url   text,                        -- optional photo
  visible     boolean not null default true,
  sort        int  not null default 0
);
alter table services add column if not exists fee int;
alter table services add column if not exists image_url text;
alter table services add column if not exists visible boolean not null default true;

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'Event',
  starts_on   date not null,
  venue       text not null default '',
  description text not null default '',
  link        text
);

-- Health articles written by the doctor. Body: blank line = new paragraph,
-- '## ' starts a heading, '- ' starts a bullet point.
create table if not exists articles (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title        text not null,
  category     text not null default 'Nutrition',
  summary      text not null default '',
  body         text not null default '',
  cover_url    text,
  published    boolean not null default false,
  published_on date not null default current_date,
  updated_at   timestamptz not null default now()
);

create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rating     int  not null check (rating between 1 and 5),
  body       text not null,
  approved   boolean not null default false,
  created_at timestamptz not null default now()
);
alter table reviews add column if not exists reply text;              -- the doctor's remark, shown under the review
alter table reviews add column if not exists verified boolean not null default false;  -- written after a completed visit
alter table reviews add column if not exists appointment_id uuid;

-- Achievements and photos: doctor at work, awards, events. image_url is optional
-- (an award can be listed without a photo).
create table if not exists gallery (
  id        uuid primary key default gen_random_uuid(),
  caption   text not null default '',
  kind      text not null default 'At work',   -- At work, Award, Achievement, Event
  year      text,
  image_url text,
  visible   boolean not null default true,
  sort      int not null default 0
);

-- ---------- Clinics (a doctor can work at several) ----------
create table if not exists clinics (
  id       uuid primary key default gen_random_uuid(),
  name     text not null,
  address  text not null default '',
  phone    text,
  map_link text,
  visible  boolean not null default true,
  sort     int not null default 0
);
-- Older single-clinic sites: copy the clinic from settings once.
insert into clinics (name, address, map_link)
select clinic_name, clinic_address, map_link from settings
where id = 1 and clinic_name <> '' and not exists (select 1 from clinics);

-- ---------- Schedule ----------
-- weekday: 0 = Sunday ... 6 = Saturday. mode: clinic or video.
create table if not exists availability (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6),
  mode       text not null check (mode in ('clinic','video')),
  start_time time not null,
  end_time   time not null check (end_time > start_time)
);
-- Clinic hours belong to a clinic; video hours have no clinic.
alter table availability add column if not exists clinic_id uuid references clinics(id) on delete cascade;
update availability set clinic_id = (select id from clinics order by sort, name limit 1)
where mode = 'clinic' and clinic_id is null;

create table if not exists blocked_dates (
  day    date primary key,
  reason text
);

-- ---------- Appointments ----------
create table if not exists appointments (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  mode           text not null check (mode in ('clinic','video','followup')),
  day            date not null,
  time           time not null,
  patient_name   text not null,
  phone          text not null,
  age            int,
  booking_for    text,
  reason         text,
  payment_method text,
  fee            int,
  receipt_path   text,                          -- file in the private 'receipts' storage bucket
  paid           boolean not null default false,
  status         text not null default 'pending'
                 check (status in ('pending','confirmed','completed','cancelled','no_show')),
  video_room     text,
  notes          text,
  prescription   text,
  created_at     timestamptz not null default now()
);
-- One patient per time slot (cancelled bookings free the slot again).
alter table appointments add column if not exists receipt_path text;
alter table appointments add column if not exists paid boolean not null default false;
alter table appointments add column if not exists clinic_id uuid references clinics(id) on delete set null;
alter table appointments add column if not exists treatment text;          -- diagnosis / treatment plan: the patient can see it
alter table appointments add column if not exists patient_user_id uuid;    -- the patient's login, once linked
do $$ begin
  alter table reviews add constraint reviews_appointment_fk foreign key (appointment_id) references appointments(id) on delete set null;
exception when duplicate_object then null; end $$;
create unique index if not exists reviews_one_per_appointment on reviews (appointment_id) where appointment_id is not null;
create unique index if not exists appointments_slot_unique
  on appointments (day, time) where status <> 'cancelled';

-- ---------- Patient accounts ----------
-- One row per patient login (Supabase Auth user). The patient fills in their own health profile.
create table if not exists patients (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text not null,
  dob         date,
  gender      text,
  blood_group text,
  allergies   text,
  conditions  text,      -- e.g. diabetes, thyroid
  medicines   text,      -- current medicines
  created_at  timestamptz not null default now()
);
do $$ begin
  alter table appointments add constraint appointments_patient_fk foreign key (patient_user_id) references patients(user_id) on delete set null;
exception when duplicate_object then null; end $$;
create index if not exists appointments_patient_idx on appointments (patient_user_id);

-- Reports and files: lab results, diet plans, scans. Uploaded by the doctor (to a visit)
-- or by the patient (to their own record). Files live in the private 'reports' bucket.
create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  patient_user_id uuid references patients(user_id) on delete cascade,
  appointment_id  uuid references appointments(id) on delete set null,
  title           text not null,
  note            text,
  file_path       text not null unique,
  uploaded_by     text not null default 'doctor' check (uploaded_by in ('doctor','patient')),
  created_at      timestamptz not null default now()
);

-- A report attached to a visit follows that visit's patient.
create or replace function reports_follow_visit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.patient_user_id is null and new.appointment_id is not null then
    select patient_user_id into new.patient_user_id from appointments where id = new.appointment_id;
  end if;
  return new;
end $$;
drop trigger if exists reports_follow_visit on reports;
create trigger reports_follow_visit before insert or update on reports for each row execute function reports_follow_visit();

-- ---------- Row level security ----------
alter table settings      enable row level security;
alter table admins        enable row level security;
alter table services      enable row level security;
alter table events        enable row level security;
alter table articles      enable row level security;
alter table reviews       enable row level security;
alter table availability  enable row level security;
alter table blocked_dates enable row level security;
alter table clinics       enable row level security;
alter table gallery       enable row level security;
alter table patients      enable row level security;
alter table reports       enable row level security;
alter table appointments  enable row level security;

do $$
declare t text;
begin
  -- Public can read the website content; only admins can change it.
  foreach t in array array['settings','services','events','availability','blocked_dates','clinics','gallery'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

drop policy if exists "admin read" on admins;
create policy "admin read" on admins for select to authenticated using (user_id = auth.uid());

-- Reviews: public sees approved ones and can submit new ones (hidden until approved).
drop policy if exists "public read approved" on reviews;
create policy "public read approved" on reviews for select using (approved or is_admin());
drop policy if exists "public submit" on reviews;
create policy "public submit" on reviews for insert
  with check (approved = false and verified = false and reply is null and appointment_id is null
              and char_length(body) <= 1000 and char_length(name) <= 80);
drop policy if exists "admin manage" on reviews;
create policy "admin manage" on reviews for all to authenticated using (is_admin()) with check (is_admin());

-- Articles: public reads published ones only; admins manage all, drafts included.
drop policy if exists "public read published" on articles;
create policy "public read published" on articles for select using (published or is_admin());
drop policy if exists "admin manage" on articles;
create policy "admin manage" on articles for all to authenticated using (is_admin()) with check (is_admin());

-- Patients: each sees and edits only their own profile; the doctor sees all.
drop policy if exists "own profile read" on patients;
create policy "own profile read" on patients for select to authenticated using (user_id = auth.uid() or is_admin());
drop policy if exists "own profile update" on patients;
create policy "own profile update" on patients for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "admin manage" on patients;
create policy "admin manage" on patients for all to authenticated using (is_admin()) with check (is_admin());

-- Reports: patients see their own and may add their own; the doctor manages all.
drop policy if exists "own reports read" on reports;
create policy "own reports read" on reports for select to authenticated using (patient_user_id = auth.uid());
drop policy if exists "own reports add" on reports;
create policy "own reports add" on reports for insert to authenticated
  with check (patient_user_id = auth.uid() and uploaded_by = 'patient' and appointment_id is null
              and split_part(file_path, '/', 1) = auth.uid()::text);
drop policy if exists "own reports delete" on reports;
create policy "own reports delete" on reports for delete to authenticated using (patient_user_id = auth.uid() and uploaded_by = 'patient');
drop policy if exists "admin manage" on reports;
create policy "admin manage" on reports for all to authenticated using (is_admin()) with check (is_admin());

-- Appointments: only admins read or change them. Patients book through book_appointment()
-- and read their own history through my_history() (which leaves out the doctor's private notes).
drop policy if exists "admin manage" on appointments;
create policy "admin manage" on appointments for all to authenticated using (is_admin()) with check (is_admin());

-- ---------- Booking functions (run with elevated rights, validate everything) ----------
create or replace function pk_today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Karachi')::date;
$$;

-- Times already taken on a day (no patient details are exposed).
create or replace function get_taken_slots(p_day date) returns setof time
language sql stable security definer set search_path = public as $$
  select time from appointments where day = p_day and status <> 'cancelled';
$$;

drop function if exists book_appointment(text,date,time,text,text,int,text,text,text);
drop function if exists book_appointment(text,date,time,text,text,int,text,text,text,text);
create or replace function book_appointment(
  p_mode text, p_day date, p_time time,
  p_name text, p_phone text, p_age int, p_for text, p_reason text, p_payment text,
  p_receipt text default null,
  p_clinic uuid default null          -- clinic visits and clinic follow-ups; null = video
) returns json
language plpgsql security definer set search_path = public as $$
declare
  s settings%rowtype;
  v_wd int := extract(dow from p_day);
  v_sched_mode text;
  v_ok boolean;
  v_code text;
  v_room text;
  v_fee int;
  v_now_time time := (now() at time zone 'Asia/Karachi')::time;
begin
  select * into s from settings where id = 1;
  if not s.booking_open then raise exception 'Online booking is closed at the moment.'; end if;
  if p_mode not in ('clinic','video','followup') then raise exception 'Unknown consultation type.'; end if;
  if p_mode = 'video' and not s.video_open then raise exception 'Video consultations are paused.'; end if;
  if coalesce(trim(p_name),'') = '' or coalesce(trim(p_phone),'') = '' then raise exception 'Name and mobile number are required.'; end if;
  if char_length(p_name) > 80 or char_length(p_phone) > 20 or char_length(coalesce(p_reason,'')) > 500 then raise exception 'Some details are too long.'; end if;
  if p_day < pk_today() or p_day > pk_today() + s.booking_days then raise exception 'Please pick a date within the booking window.'; end if;
  if p_day = pk_today() and p_time <= v_now_time then raise exception 'That time has already passed.'; end if;
  if exists (select 1 from blocked_dates where day = p_day) then raise exception 'The doctor is not available on that date.'; end if;

  -- Clinic visits need a clinic; follow-ups are at a clinic (p_clinic given) or by video.
  if p_mode = 'video' then p_clinic := null; end if;
  if p_mode = 'clinic' and p_clinic is null then raise exception 'Please choose a clinic.'; end if;
  if p_clinic is not null and not exists (select 1 from clinics where id = p_clinic and visible) then
    raise exception 'That clinic is not available.';
  end if;
  v_sched_mode := case when p_clinic is not null then 'clinic' else 'video' end;
  if v_sched_mode = 'video' and not s.video_open then raise exception 'Video consultations are paused.'; end if;

  select exists (
    select 1 from availability a
    where a.weekday = v_wd
      and a.mode = v_sched_mode
      and (v_sched_mode = 'video' or a.clinic_id = p_clinic)
      and p_time >= a.start_time
      and p_time + make_interval(mins => s.slot_minutes) <= a.end_time
      and (extract(epoch from (p_time - a.start_time))::int % (s.slot_minutes * 60)) = 0
  ) into v_ok;
  if not v_ok then raise exception 'That time is outside the doctor''s hours.'; end if;

  if p_payment in ('JazzCash','Easypaisa','Bank transfer') then
    if p_receipt is null then raise exception 'Please attach the payment receipt.'; end if;
    if p_receipt !~ '^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$'
       or not exists (select 1 from storage.objects o where o.bucket_id = 'receipts' and o.name = p_receipt) then
      raise exception 'The receipt upload did not complete. Please attach it again.';
    end if;
    if exists (select 1 from appointments where receipt_path = p_receipt) then
      raise exception 'This receipt is already attached to another booking.';
    end if;
  else
    p_receipt := null;
  end if;

  v_code := 'TB-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6));
  if v_sched_mode = 'video' then
    v_room := 'dr-' || encode(gen_random_bytes(9), 'hex');
  end if;
  v_fee := case p_mode when 'clinic' then s.clinic_fee when 'video' then s.video_fee else s.followup_fee end;

  begin
    insert into appointments (code, mode, day, time, patient_name, phone, age, booking_for, reason, payment_method, fee, video_room, receipt_path, clinic_id, patient_user_id)
    values (v_code, p_mode, p_day, p_time, trim(p_name), trim(p_phone), p_age, p_for, p_reason, p_payment, v_fee, v_room, p_receipt, p_clinic,
            (select user_id from patients where user_id = auth.uid()));
  exception when unique_violation then
    raise exception 'Sorry, that slot was just taken. Please pick another time.';
  end;

  return json_build_object('code', v_code, 'video_room', v_room, 'fee', v_fee, 'day', p_day, 'time', p_time, 'mode', p_mode,
                           'clinic', (select json_build_object('name', name, 'address', address) from clinics where id = p_clinic));
end $$;

-- Patient looks up their own booking with code + mobile number.
create or replace function get_appointment(p_code text, p_phone text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('code', a.code, 'mode', a.mode, 'day', a.day, 'time', a.time, 'status', a.status,
                           'patient_name', a.patient_name, 'video_room', a.video_room,
                           'prescription', a.prescription, 'fee', a.fee,
                           'payment_method', a.payment_method, 'paid', a.paid,
                           'clinic_name', c.name, 'clinic_address', c.address, 'clinic_map', c.map_link,
                           'reviewed', exists (select 1 from reviews r where r.appointment_id = a.id))
  from appointments a left join clinics c on c.id = a.clinic_id
  where upper(a.code) = upper(trim(p_code))
    and right(regexp_replace(a.phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
  limit 1;
$$;

-- A patient reviews a completed visit (code + mobile number). Shown as
-- "Verified patient" once the doctor approves it. One review per visit.
create or replace function submit_review(p_code text, p_phone text, p_rating int, p_body text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a appointments%rowtype; v_name text;
begin
  if p_rating not between 1 and 5 then raise exception 'Please choose 1 to 5 stars.'; end if;
  if char_length(trim(coalesce(p_body,''))) < 10 or char_length(p_body) > 1000 then raise exception 'Please write a sentence or two (up to 1000 characters).'; end if;
  select * into a from appointments
  where upper(code) = upper(trim(p_code))
    and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
  limit 1;
  if not found then raise exception 'Appointment not found.'; end if;
  if a.status <> 'completed' then raise exception 'You can review after your consultation.'; end if;
  if exists (select 1 from reviews where appointment_id = a.id) then raise exception 'You have already reviewed this visit. Thank you!'; end if;
  -- First name and last initial only, e.g. "Ali R."
  v_name := split_part(trim(a.patient_name), ' ', 1)
            || coalesce(' ' || nullif(left(split_part(trim(a.patient_name), ' ', 2), 1), '') || '.', '');
  insert into reviews (name, rating, body, approved, verified, appointment_id)
  values (v_name, p_rating, trim(p_body), false, true, a.id);
  return true;
end $$;

-- Patient cancels their own booking (code + mobile number).
create or replace function cancel_appointment(p_code text, p_phone text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update appointments set status = 'cancelled'
  where upper(code) = upper(trim(p_code))
    and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
    and status in ('pending','confirmed')
    and (day > pk_today() or (day = pk_today() and time > (now() at time zone 'Asia/Karachi')::time));
  return found;
end $$;

-- ---------- Patient portal functions ----------
-- Create the patient's profile on first sign-in (name and mobile from sign-up).
create or replace function ensure_patient(p_name text, p_phone text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Please sign in.'; end if;
  insert into patients (user_id, full_name, phone)
  values (me, left(coalesce(nullif(trim(p_name), ''), 'Patient'), 80), left(coalesce(trim(p_phone), ''), 20))
  on conflict (user_id) do nothing;
  return (select row_to_json(p) from patients p where user_id = me);
end $$;

-- Add past bookings to the account. Proof = a booking code plus the mobile number used.
-- Every unlinked booking with that mobile number is then added.
create or replace function link_bookings(p_code text, p_phone text) returns int
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a appointments%rowtype; digits text; n int;
begin
  if me is null or not exists (select 1 from patients where user_id = me) then raise exception 'Please sign in.'; end if;
  digits := right(regexp_replace(p_phone, '\D', '', 'g'), 10);
  if length(digits) < 10 then raise exception 'Enter the full mobile number.'; end if;
  select * into a from appointments
  where upper(code) = upper(trim(p_code)) and right(regexp_replace(phone, '\D', '', 'g'), 10) = digits limit 1;
  if not found then raise exception 'No booking found with this code and mobile number.'; end if;
  if a.patient_user_id is not null and a.patient_user_id <> me then
    raise exception 'This booking is already linked to another account. Please contact the clinic.';
  end if;
  update appointments set patient_user_id = me
  where patient_user_id is null and right(regexp_replace(phone, '\D', '', 'g'), 10) = digits;
  get diagnostics n = row_count;
  update reports r set patient_user_id = me
  from appointments x where r.appointment_id = x.id and x.patient_user_id = me and r.patient_user_id is null;
  return n;
end $$;

-- The signed-in patient's visits, newest first, without the doctor's private notes.
create or replace function my_history() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(h) order by h.day desc, h.time desc), '[]'::json) from (
    select a.id, a.code, a.mode, a.day, a.time, a.status, a.patient_name, a.booking_for, a.reason, a.phone,
           a.treatment, a.prescription, a.fee, a.paid, a.payment_method, a.video_room,
           c.name as clinic_name, c.address as clinic_address, c.map_link as clinic_map,
           exists (select 1 from reviews r where r.appointment_id = a.id) as reviewed
    from appointments a left join clinics c on c.id = a.clinic_id
    where a.patient_user_id = auth.uid() and auth.uid() is not null
  ) h;
$$;

revoke all on function book_appointment(text,date,time,text,text,int,text,text,text,text,uuid) from public;
grant execute on function book_appointment(text,date,time,text,text,int,text,text,text,text,uuid) to anon, authenticated;
grant execute on function submit_review(text,text,int,text) to anon, authenticated;
grant execute on function ensure_patient(text,text) to authenticated;
grant execute on function link_bookings(text,text) to authenticated;
grant execute on function my_history() to authenticated;
grant execute on function get_taken_slots(date) to anon, authenticated;
grant execute on function get_appointment(text,text) to anon, authenticated;
grant execute on function cancel_appointment(text,text) to anon, authenticated;

-- ---------- Live updates in the doctor panel ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'appointments') then
    alter publication supabase_realtime add table appointments;
  end if;
exception when undefined_object then null;
end $$;

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and is_admin());

-- Payment receipts: private bucket. Patients can upload (images or PDF, max 5 MB) but never read;
-- only the doctor and staff can view them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "receipt upload" on storage.objects;
create policy "receipt upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'receipts' and name ~ '^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|pdf)$');
drop policy if exists "receipt admin read" on storage.objects;
create policy "receipt admin read" on storage.objects for select to authenticated using (bucket_id = 'receipts' and is_admin());
drop policy if exists "receipt admin delete" on storage.objects;
create policy "receipt admin delete" on storage.objects for delete to authenticated using (bucket_id = 'receipts' and is_admin());

-- Reports and files: private bucket. The doctor manages everything; a patient can read the
-- files listed in their own reports and upload into a folder named after their account.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "reports admin all" on storage.objects;
create policy "reports admin all" on storage.objects for all to authenticated
  using (bucket_id = 'reports' and is_admin()) with check (bucket_id = 'reports' and is_admin());
drop policy if exists "reports patient read" on storage.objects;
create policy "reports patient read" on storage.objects for select to authenticated
  using (bucket_id = 'reports' and exists (select 1 from public.reports r where r.file_path = storage.objects.name and r.patient_user_id = auth.uid()));
drop policy if exists "reports patient upload" on storage.objects;
create policy "reports patient upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and split_part(name, '/', 1) = auth.uid()::text
              and exists (select 1 from public.patients p where p.user_id = auth.uid()));
