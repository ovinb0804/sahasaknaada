-- Check-in must never admit a cancelled member (single check-in and whole-team check-in).
create or replace function public.check_in_member(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(btrim(coalesce(p_code, '')));
  m public.members;
  s public.schools;
  n int;
begin
  if not public.is_staff() then raise exception 'Not authorised' using errcode = '42501'; end if;

  if v ~ '^[0-9]{1,7}$' then
    select * into m from public.members where member_no = v::int;
  elsif v ~ '^SSA-?[0-9]{1,7}$' then
    select * into m from public.members where member_no = substring(v from '[0-9]+')::int;
  else
    select * into m from public.members where pass_code = v;
  end if;
  if not found then return jsonb_build_object('result', 'not_found'); end if;

  select * into s from public.schools where id = m.school_id;
  if s.status = 'cancelled' then
    return jsonb_build_object('result', 'school_cancelled', 'card', public.member_card(m.id));
  end if;
  if m.registration_status = 'cancelled' then
    return jsonb_build_object('result', 'cancelled', 'card', public.member_card(m.id));
  end if;

  update public.members set checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
  where id = m.id and checked_in_at is null;
  get diagnostics n = row_count;

  return jsonb_build_object(
    'result', case when n = 1 then 'checked_in' else 'already_checked_in' end,
    'card', public.member_card(m.id));
end $$;

create or replace function public.check_in_team(p_school_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'Not authorised' using errcode = '42501'; end if;
  if exists (select 1 from public.schools where id = p_school_id and status = 'cancelled') then
    raise exception 'This school registration is cancelled.' using errcode = 'P0001';
  end if;
  update public.members set checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
  where school_id = p_school_id and checked_in_at is null and registration_status <> 'cancelled';
  get diagnostics n = row_count;
  return n;
end $$;
