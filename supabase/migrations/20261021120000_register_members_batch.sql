-- Batch member registration: several members of one school in a single atomic call.
create or replace function public.register_members(p_code text, p_members jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  s public.schools;
  cfg public.event_settings;
  m public.members;
  item jsonb;
  idx int := 0;
  n_new int;
  n_existing int;
  v_email text;
  v_phone text;
  v_dup boolean;
  v_seen_emails text[] := '{}';
  v_seen_phones text[] := '{}';
  v_out jsonb := '[]'::jsonb;
begin
  perform public.rate_check('member_submit', 10, interval '1 hour');
  if not public.form_is_open('member') then
    raise exception 'Member registration is not open right now.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_members) is distinct from 'array' or jsonb_array_length(p_members) < 1 then
    raise exception 'Add at least one member.' using errcode = 'P0001';
  end if;
  n_new := jsonb_array_length(p_members);
  if n_new > 30 then
    raise exception 'You can register up to 30 members at a time.' using errcode = 'P0001';
  end if;

  select * into s from public.schools where short_code = v;
  if not found then raise exception 'That school code was not recognised.' using errcode = 'P0001'; end if;
  if not s.code_active or s.status = 'cancelled' then
    raise exception 'This school code is no longer active. Please contact your radio club or the organizers.' using errcode = 'P0001';
  end if;

  select * into cfg from public.event_settings where id;
  if cfg.member_cap_enabled then
    select count(*) into n_existing from public.members where school_id = s.id and registration_status <> 'cancelled';
    if n_existing + n_new > cfg.max_members_per_school then
      raise exception 'This school can register % more member(s).', greatest(cfg.max_members_per_school - n_existing, 0) using errcode = 'P0001';
    end if;
  end if;

  for item in select * from jsonb_array_elements(p_members) loop
    idx := idx + 1;
    v_email := nullif(lower(btrim(coalesce(item->>'email', ''))), '');
    v_phone := nullif(btrim(coalesce(item->>'phone', '')), '');

    select exists (
      select 1 from public.members x
      where x.school_id = s.id and x.registration_status <> 'cancelled'
        and ((v_email is not null and lower(x.email) = v_email) or (v_phone is not null and x.phone = v_phone))
    ) or (v_email is not null and v_email = any (v_seen_emails))
      or (v_phone is not null and v_phone = any (v_seen_phones))
    into v_dup;

    begin
      insert into public.members (school_id, full_name, grade, email, phone, role, registration_status)
      values (s.id, btrim(coalesce(item->>'full_name', '')),
              nullif(btrim(coalesce(item->>'grade', '')), ''),
              v_email, v_phone, 'student',
              case when v_dup then 'needs_review' else 'submitted' end)
      returning * into m;
    exception
      when check_violation or not_null_violation or invalid_text_representation then
        raise exception 'Member % has missing or invalid details. Please review the form.', idx using errcode = 'P0001';
    end;

    if v_email is not null then v_seen_emails := v_seen_emails || v_email; end if;
    if v_phone is not null then v_seen_phones := v_seen_phones || v_phone; end if;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'full_name', m.full_name,
      'reference', 'SSA-' || lpad(m.member_no::text, 4, '0'),
      'pass_code', m.pass_code,
      'possible_duplicate', v_dup));
  end loop;

  return jsonb_build_object('status', 'created', 'school_name', s.name, 'members', v_out);
end $$;

revoke execute on function public.register_members(text, jsonb) from public;
grant execute on function public.register_members(text, jsonb) to anon, authenticated;
