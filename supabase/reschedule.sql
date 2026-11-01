-- ---------- Reschedule, delete and remove-from-my-list ----------
alter table appointments add column if not exists patient_hidden boolean not null default false; -- patient removed it from their list (the doctor still has it)
alter table appointments add column if not exists moved_from timestamp;                          -- previous date and time after a reschedule
alter table appointments add column if not exists moves int not null default 0;                  -- how often the patient has moved it

-- Checks a new time against the doctor's hours, days off and booking window.
create or replace function check_slot(p_day date, p_time time, p_clinic uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare s settings%rowtype; v_mode text := case when p_clinic is null then 'video' else 'clinic' end;
begin
  select * into s from settings where id = 1;
  if p_day < pk_today() or p_day > pk_today() + s.booking_days then raise exception 'Please pick a date within the booking window.'; end if;
  if p_day = pk_today() and p_time <= (now() at time zone 'Asia/Karachi')::time then raise exception 'That time has already passed.'; end if;
  if exists (select 1 from blocked_dates where day = p_day) then raise exception 'The doctor is not available on that date.'; end if;
  if v_mode = 'video' and not s.video_open then raise exception 'Video consultations are paused.'; end if;
  if p_clinic is not null and not exists (select 1 from clinics where id = p_clinic and visible) then raise exception 'That clinic is not available.'; end if;
  if not exists (
    select 1 from availability a
    where a.weekday = extract(dow from p_day) and a.mode = v_mode and (v_mode = 'video' or a.clinic_id = p_clinic)
      and p_time >= a.start_time and p_time + make_interval(mins => s.slot_minutes) <= a.end_time
      and (extract(epoch from (p_time - a.start_time))::int % (s.slot_minutes * 60)) = 0
  ) then raise exception 'That time is outside the doctor''s hours.'; end if;
end $$;

-- Patient moves their own upcoming appointment (code + mobile number, also used by the patient account).
-- The appointment goes back to "New" so the doctor confirms the new time. Up to 3 moves.
create or replace function reschedule_appointment(p_code text, p_phone text, p_day date, p_time time) returns json
language plpgsql security definer set search_path = public as $$
declare a appointments%rowtype;
begin
  select * into a from appointments
  where upper(code) = upper(trim(p_code))
    and right(regexp_replace(phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
  limit 1 for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if a.status not in ('pending', 'confirmed') then raise exception 'Only upcoming appointments can be moved.'; end if;
  if a.day < pk_today() or (a.day = pk_today() and a.time <= (now() at time zone 'Asia/Karachi')::time) then
    raise exception 'This appointment time has passed. Please book a new one.';
  end if;
  if a.moves >= 3 then raise exception 'This appointment has already been moved 3 times. Please contact the clinic.'; end if;
  if a.day = p_day and a.time = p_time then raise exception 'Please pick a different date or time.'; end if;
  perform check_slot(p_day, p_time, a.clinic_id);
  begin
    update appointments set day = p_day, time = p_time, status = 'pending', moved_from = a.day + a.time, moves = a.moves + 1
    where id = a.id;
  exception when unique_violation then
    raise exception 'Sorry, that time was just taken. Please pick another.';
  end;
  return json_build_object('day', p_day, 'time', p_time);
end $$;

-- Patient removes a past or cancelled visit from their own list. The doctor's record is kept.
create or replace function hide_my_appointment(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update appointments set patient_hidden = true
  where id = p_id and auth.uid() is not null and patient_user_id = auth.uid()
    and not (status in ('pending', 'confirmed')
             and (day > pk_today() or (day = pk_today() and time > (now() at time zone 'Asia/Karachi')::time)));
  return found;
end $$;

-- Same as before, plus clinic_id and moved_from (needed to reschedule), and hidden visits left out.
create or replace function my_history() returns json
language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(h) order by h.day desc, h.time desc), '[]'::json) from (
    select a.id, a.code, a.mode, a.day, a.time, a.status, a.patient_name, a.booking_for, a.reason, a.phone,
           a.treatment, a.prescription, a.fee, a.paid, a.payment_method, a.video_room, a.clinic_id, a.moved_from,
           c.name as clinic_name, c.address as clinic_address, c.map_link as clinic_map,
           exists (select 1 from reviews r where r.appointment_id = a.id) as reviewed
    from appointments a left join clinics c on c.id = a.clinic_id
    where a.patient_user_id = auth.uid() and auth.uid() is not null and not a.patient_hidden
  ) h;
$$;

create or replace function get_appointment(p_code text, p_phone text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('code', a.code, 'mode', a.mode, 'day', a.day, 'time', a.time, 'status', a.status,
                           'patient_name', a.patient_name, 'video_room', a.video_room,
                           'prescription', a.prescription, 'fee', a.fee,
                           'payment_method', a.payment_method, 'paid', a.paid,
                           'clinic_id', a.clinic_id, 'moved_from', a.moved_from,
                           'clinic_name', c.name, 'clinic_address', c.address, 'clinic_map', c.map_link,
                           'reviewed', exists (select 1 from reviews r where r.appointment_id = a.id))
  from appointments a left join clinics c on c.id = a.clinic_id
  where upper(a.code) = upper(trim(p_code))
    and right(regexp_replace(a.phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    and length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
  limit 1;
$$;

revoke all on function check_slot(date, time, uuid) from public, anon, authenticated;
grant execute on function reschedule_appointment(text, text, date, time) to anon, authenticated;
grant execute on function hide_my_appointment(uuid) to authenticated;
