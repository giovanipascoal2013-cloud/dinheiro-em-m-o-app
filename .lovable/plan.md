

## Plan: Agent Zone Assignment + Fix Main Page Listing

### Problem 1: Main Page Not Listing Zones/ATMs
The RLS policies for `zones` and `atms` tables require `authenticated` role for SELECT. Unauthenticated users visiting the homepage cannot fetch any data. Need to change these policies to allow public read access (zones and ATMs are not sensitive data).

**Database migration:**
- Drop existing SELECT policies on `zones` and `atms` that restrict to `authenticated`
- Create new SELECT policies allowing `anon` and `authenticated` roles to read zones and ATMs

### Problem 2: Agent Zone Assignment (Admin/Supervisor only)
Update `src/pages/dashboard/Agents.tsx` to add zone assignment functionality:

- Fetch each agent's assigned zones from `agent_zones` table and display them as badges under each agent
- Add "Atribuir Zona" button per agent, opening a Dialog with:
  - Select dropdown of available zones (fetched from `zones` table)
  - On submit: insert into `agent_zones` with auto-generated `referral_code` using `generate_referral_code()` DB function
- Add remove button (X) on each zone badge to delete from `agent_zones`
- Only admin/supervisor can access this page (already enforced by route protection and RLS)

### Files to modify:
- `src/pages/dashboard/Agents.tsx` — add zone assignment UI and logic
- **DB migration** — update RLS policies on `zones` and `atms` for public SELECT access

