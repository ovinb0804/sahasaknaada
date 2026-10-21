-- School-first registration (short code + QR, member form by code). Additive only.
alter table public.schools
  add column if not exists address text,
  add column if not exists club_name text,
  add column if not exists mic_phone text,
  add column if not exists mic_email text,
  add column if not exists short_code text,
  add column if not exists code_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.schools
  add constraint schools_address_len check (address is null or char_length(address) <= 200),
  add constraint schools_club_len check (club_name is null or char_length(club_name) <= 120),
  add constraint schools_mic_phone_fmt check (mic_phone is null or mic_phone ~ '^[0-9+()\s-]{7,20}$'),
  add constraint schools_mic_email_fmt check (mic_email is null or (char_length(mic_email) <= 254 and mic_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  add constraint schools_short_code_fmt check (short_code is null or short_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');
create unique index if not exists schools_short_code_key on public.schools (short_code);

create or replace function public.gen_short_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea; v text; i int;
begin
  loop
    bytes := decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex');
    v := '';
    for i in 0..5 loop
      v := v || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.schools where short_code = v);
  end loop;
  return v;
end $$;

create or replace function public.set_school_short_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.short_code is null or new.short_code = '' then
    new.short_code := public.gen_short_code();
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists schools_short_code on public.schools;
create trigger schools_short_code before insert or update on public.schools
  for each row execute function public.set_school_short_code();
update public.schools set short_code = public.gen_short_code() where short_code is null;

alter table public.members
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists registration_status text not null default 'submitted',
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.members
  add constraint members_status_check check (registration_status in ('submitted','confirmed','needs_review','cancelled')),
  add constraint members_email_fmt check (email is null or (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  add constraint members_phone_fmt check (phone is null or phone ~ '^[0-9+()\s-]{7,20}$'),
  add constraint members_notes_len check (internal_notes is null or char_length(internal_notes) <= 1000);

alter table public.event_settings
  add column if not exists registration_phase text not null default 'schools_first',
  add column if not exists school_form_open boolean not null default true,
  add column if not exists member_form_open boolean not null default true,
  add column if not exists school_opens_at timestamptz,
  add column if not exists school_closes_at timestamptz,
  add column if not exists member_opens_at timestamptz,
  add column if not exists member_closes_at timestamptz,
  add column if not exists member_cap_enabled boolean not null default false;
alter table public.event_settings
  add constraint event_settings_phase check (registration_phase in ('schools_first','open'));

create table if not exists public.school_review_queue (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false
);
alter table public.school_review_queue enable row level security;
create policy "staff read review queue" on public.school_review_queue
  for select to authenticated using (public.is_staff());
create policy "admins update review queue" on public.school_review_queue
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  client text not null,
  kind text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_lookup on public.rate_events (client, kind, at);
alter table public.rate_events enable row level security;

create or replace function public.rate_check(p_kind text, p_limit int, p_window interval)
returns void language plpgsql security definer set search_path = '' as $$
declare
  hdr text := coalesce(current_setting('request.headers', true), '{}');
  v_client text;
  n int;
begin
  begin
    v_client := coalesce((hdr::json)->>'x-forwarded-for', (hdr::json)->>'cf-connecting-ip', 'unknown');
  exception when others then v_client := 'unknown';
  end;
  v_client := btrim(split_part(v_client, ',', 1));
  delete from public.rate_events where at < now() - interval '1 day' and random() < 0.05;
  select count(*) into n from public.rate_events
    where client = v_client and kind = p_kind and at > now() - p_window;
  if n >= p_limit then
    raise exception 'Too many attempts. Please wait a few minutes and try again.' using errcode = 'P0001';
  end if;
  insert into public.rate_events (client, kind) values (v_client, p_kind);
end $$;
revoke all on function public.rate_check(text,int,interval) from public, anon, authenticated;

create or replace function public.form_is_open(p_form text) returns boolean
language sql stable security definer set search_path = '' as $$
  select s.registration_open
     and case when p_form = 'school'
           then s.school_form_open and (s.school_opens_at is null or s.school_opens_at <= now()) and (s.school_closes_at is null or s.school_closes_at > now())
           else s.member_form_open and (s.member_opens_at is null or s.member_opens_at <= now()) and (s.member_closes_at is null or s.member_closes_at > now())
         end
  from public.event_settings s where s.id;
$$;
revoke all on function public.form_is_open(text) from public, anon, authenticated;

create or replace function public.register_school_v2(p_school jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_name text := btrim(coalesce(p_school->>'name', ''));
  v_email text := lower(btrim(coalesce(p_school->>'contact_email', '')));
  v_key text;
  v_id uuid;
  v_code text;
begin
  perform public.rate_check('school_submit', 5, interval '1 hour');
  if not public.form_is_open('school') then
    raise exception 'School registration is not open right now.' using errcode = 'P0001';
  end if;
  v_key := lower(regexp_replace(v_name, '\s+', ' ', 'g'));
  if v_name <> '' and exists (select 1 from public.schools where name_key = v_key or lower(contact_email) = v_email) then
    insert into public.school_review_queue (payload, reason)
      values (p_school - 'notes', 'possible duplicate school');
    return jsonb_build_object('status', 'duplicate');
  end if;
  begin
    insert into public.schools (name, address, district, contact_email, contact_phone,
                                club_name, teacher_name, mic_phone, mic_email, notes, status)
    values (
      v_name,
      btrim(coalesce(p_school->>'address', '')),
      btrim(coalesce(p_school->>'district', '')),
      v_email,
      btrim(coalesce(p_school->>'contact_phone', '')),
      btrim(coalesce(p_school->>'club_name', '')),
      btrim(coalesce(p_school->>'mic_name', '')),
      btrim(coalesce(p_school->>'mic_phone', '')),
      nullif(lower(btrim(coalesce(p_school->>'mic_email', ''))), ''),
      nullif(btrim(coalesce(p_school->>'notes', '')), ''),
      'confirmed')
    returning id, short_code into v_id, v_code;
  exception
    when check_violation or not_null_violation or invalid_text_representation then
      raise exception 'Some details are missing or invalid. Please review the form.' using errcode = 'P0001';
  end;
  return jsonb_build_object('status', 'created', 'school_name', v_name, 'short_code', v_code);
end $$;

create or replace function public.lookup_school_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  s public.schools;
  cfg public.event_settings;
  n int;
begin
  perform public.rate_check('code_lookup', 30, interval '10 minutes');
  if v = '' then return jsonb_build_object('valid', false, 'reason', 'empty'); end if;
  select * into s from public.schools where short_code = v;
  if not found then return jsonb_build_object('valid', false, 'reason', 'unknown'); end if;
  if not s.code_active or s.status = 'cancelled' then
    return jsonb_build_object('valid', false, 'reason', 'deactivated');
  end if;
  select * into cfg from public.event_settings where id;
  if cfg.member_cap_enabled then
    select count(*) into n from public.members where school_id = s.id and registration_status <> 'cancelled';
    if n >= cfg.max_members_per_school then
      return jsonb_build_object('valid', false, 'reason', 'full');
    end if;
  end if;
  return jsonb_build_object('valid', true, 'school_name', s.name);
end $$;

create or replace function public.register_member(p_code text, p_member jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  s public.schools;
  cfg public.event_settings;
  m public.members;
  v_email text := nullif(lower(btrim(coalesce(p_member->>'email', ''))), '');
  v_phone text := nullif(btrim(coalesce(p_member->>'phone', '')), '');
  v_dup boolean;
  n int;
begin
  perform public.rate_check('member_submit', 10, interval '1 hour');
  if not public.form_is_open('member') then
    raise exception 'Member registration is not open right now.' using errcode = 'P0001';
  end if;
  select * into s from public.schools where short_code = v;
  if not found then raise exception 'That school code was not recognised.' using errcode = 'P0001'; end if;
  if not s.code_active or s.status = 'cancelled' then
    raise exception 'This school code is no longer active. Please contact your radio club or the organizers.' using errcode = 'P0001';
  end if;
  select * into cfg from public.event_settings where id;
  if cfg.member_cap_enabled then
    select count(*) into n from public.members where school_id = s.id and registration_status <> 'cancelled';
    if n >= cfg.max_members_per_school then
      raise exception 'Registrations for this school are full.' using errcode = 'P0001';
    end if;
  end if;
  select exists (
    select 1 from public.members x
    where x.school_id = s.id and x.registration_status <> 'cancelled'
      and ((v_email is not null and lower(x.email) = v_email) or (v_phone is not null and x.phone = v_phone))
  ) into v_dup;
  begin
    insert into public.members (school_id, full_name, grade, email, phone, role, registration_status)
    values (s.id, btrim(coalesce(p_member->>'full_name', '')),
            nullif(btrim(coalesce(p_member->>'grade', '')), ''),
            v_email, v_phone, 'student',
            case when v_dup then 'needs_review' else 'submitted' end)
    returning * into m;
  exception
    when check_violation or not_null_violation or invalid_text_representation then
      raise exception 'Some details are missing or invalid. Please review the form.' using errcode = 'P0001';
  end;
  return jsonb_build_object('status', 'created', 'full_name', m.full_name, 'school_name', s.name,
    'reference', 'SSA-' || lpad(m.member_no::text, 4, '0'), 'pass_code', m.pass_code,
    'possible_duplicate', v_dup);
end $$;

create or replace function public.check_in_member_id(p_member_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n int; m public.members;
begin
  if not public.is_staff() then raise exception 'Not authorised' using errcode = '42501'; end if;
  select * into m from public.members where id = p_member_id;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if m.registration_status = 'cancelled' then return jsonb_build_object('result', 'cancelled'); end if;
  update public.members set checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
    where id = p_member_id and checked_in_at is null;
  get diagnostics n = row_count;
  select * into m from public.members where id = p_member_id;
  return jsonb_build_object('result', case when n = 1 then 'checked_in' else 'already_checked_in' end,
                            'checked_in_at', m.checked_in_at);
end $$;

revoke execute on function public.register_school(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.get_school_passes(text, text) from public, anon, authenticated;
revoke execute on function public.gen_short_code() from public, anon, authenticated;
revoke execute on function public.set_school_short_code() from public, anon, authenticated;
revoke execute on function public.register_school_v2(jsonb) from public;
revoke execute on function public.lookup_school_code(text) from public;
revoke execute on function public.register_member(text, jsonb) from public;
revoke execute on function public.check_in_member_id(uuid) from public, anon;
grant execute on function public.register_school_v2(jsonb) to anon, authenticated;
grant execute on function public.lookup_school_code(text) to anon, authenticated;
grant execute on function public.register_member(text, jsonb) to anon, authenticated;
grant execute on function public.check_in_member_id(uuid) to authenticated;
