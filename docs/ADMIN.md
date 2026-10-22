# Sahasak Naada admin guide

## Who can sign in
`/admin` is limited to rows in the `staff` table. There are two roles:

| Role | Can do |
|---|---|
| `admin` | everything: settings, status changes, notes, code deactivation, exports |
| `desk` | search, check in, undo a check-in (no exports, no edits) |

## Adding a check-in desk account
1. Supabase dashboard → **Authentication → Users → Add user** (email + password, tick "Auto confirm").
2. Copy the new user's UUID, then run in the **SQL editor**:

```sql
insert into public.staff (user_id, display_name, role)
values ('<user-uuid>', 'Desk 1', 'desk');   -- or 'admin'
```

To remove access: `delete from public.staff where user_id = '<user-uuid>';`

## Event day
- **Check-in** tab, school first: the school shows its QR (or its 6-character code). Tap **Scan school QR** (needs a browser with camera QR support, such as Chrome) or type the code / use a handheld scanner and press Enter. The school's member list opens; tick each person as they arrive, or press **Check in all remaining**. Unticking undoes a check-in.
- Late arrivals: leave the school's list open and tick them later, or search for the person on their own (name, reference such as `SSA-0007` or `7`, school name, or pass code, then **Check in**). Scanning a printed pass QR also checks one person in.
- Entry passes can be printed from **Schools → open a school → Pass / All passes**.
- Cancelled members can't be checked in. Repeat check-ins are safe (shown as "Already checked in").

## Registration settings (Overview tab, admins)
Master switch, school-first phase, each form's open/close time (Sri Lanka time), and the optional per-school member limit.

## Not built / needs organizer decisions
- Emailing a school its code (organizers can copy it, or download its QR, from the Schools tab).
- Walk-in registration at the desk.
- A retention period for participant data.
