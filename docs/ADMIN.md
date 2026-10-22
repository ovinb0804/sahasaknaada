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
- **Check-in** tab: type a name, a reference (`SSA-0007` or `7`), a school name or a school code, then press **Check in**. Scanning a printed pass QR checks the person in straight away.
- Entry passes can be printed from **Schools → open a school → Pass / All passes**.
- Cancelled members can't be checked in. Repeat check-ins are safe (shown as "Already checked in").

## Registration settings (Overview tab, admins)
Master switch, school-first phase, each form's open/close time (Sri Lanka time), and the optional per-school member limit.

## Not built / needs organizer decisions
- Emailing a school its code (organizers can copy it, or download its QR, from the Schools tab).
- Walk-in registration at the desk.
- A retention period for participant data.
