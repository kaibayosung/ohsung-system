# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server (fixed on port 5173, falls back if taken)
npm run build     # production build — outputs 3 separate bundles (see multi-entry below)
npm run lint      # eslint .
npm run preview   # preview the production build
```

There is no test suite configured in this project.

Deploys are handled by Vercel on push to `main` — this sandbox has no GitHub credentials, so `git push origin main` must be run by the user after any commit made here.

## Big-picture architecture

### One repo, three separate frontends, one Supabase backend
`vite.config.js` defines three Rollup entry points, and `vercel.json` rewrites clean URLs to the corresponding static HTML:

| Entry | URL | Audience | Root component |
|---|---|---|---|
| `index.html` | `/` | 오성철강 직원 (staff) | `src/App.jsx` |
| `portal.html` | `/portal` | 거래처 고객사 | `src/portal/main.jsx` → `CustomerPortalGate.jsx` |
| `separator.html` | `/separator` | 슬리터2 현장 태블릿 (키오스크) | `src/separator/main.jsx` → `SeparatorKioskGate.jsx` |

All three share one Supabase project (`supabaseClient.js`) but branch entirely on which `*_users` table the logged-in `auth.uid()` shows up in (see Account design below). There is no shared layout/router between them — each is its own app tree.

`public/` is served as-is by both Vite dev and Vercel, so standalone static HTML tools (e.g. `warehouse-3d.html`) can be dropped in there and get a real URL with zero routing config.

### Data model: this is an ERP *layered on top of* an existing external ERP
The company already runs "그린ERP" (그린피웹, greenpweb.co.kr) as their system of record. This project does **not** replace it — it mirrors it into Supabase read-only, then adds its own tables/pages on top.

- **`greenp_*` tables** (`greenp_joborders`, `greenp_joborder_detail`, `greenp_production`, `greenp_inbound`, `greenp_outbound`, `greenp_inventory`, `greenp_receivables`, `greenp_unshipped`, `greenp_customers` view, `greenp_sync_logs`) — read-only mirrors, refreshed by Supabase Edge Functions on a `pg_cron` schedule. Treat these as **externally owned and periodically overwritten** — see the gotcha below.
- **Own tables** (`companies`, `receivables`, `shipments`, `sales_records`, `work_orders`, `products`, `order_items`, `coils`, `coil_closed_flags`, `expense_requests` + `expense_request_items`, `daily_ledger`/`ledger_records`, `work_log`, `scrap_sales`, `monthly_fixed_costs` + `monthly_fixed_cost_items`, `enfax_inbox`/`enfax_session`, `customer_fax_numbers`, `fax_send_schedule`, `inbound_fax_queue`, `access_logs`, `notifications`, `report_subscriptions`, `tax_invoices`, `sales_orders`, `kr_holidays`, `app_assets`, `company_inquiries`, `company_bank_accounts`) — these are ERP 2.0's own, written directly by the app.

**Gotcha you will hit repeatedly**: the `greenp-sync-v2-*` cron jobs replace the *entire current day's* rows in `greenp_joborders`/`greenp_production`/etc. every ~10 minutes during business hours. Any row you insert or edit by hand for "today" (e.g. to unblock a demo) can silently disappear on the next sync. If you need data to survive for a demo, either (a) pause the relevant `cron.job` rows via `cron.alter_job(id, active => false)` and remember to re-enable them afterward, or (b) prefer editing/flipping the status of a real row that's already there over inserting a fake one.

**Second gotcha**: computing "오늘" (today) must always be done in KST regardless of the device's local timezone — see `src/separator/SeparatorKiosk.jsx`'s `todayKST()` for the correct pattern (`now.getTime() + 9*3600000`, then read via `toISOString()`). A previous version of this function double-applied the timezone offset and silently returned yesterday's date for any KST time before 09:00 — if you see "date-shifted by a day" bugs anywhere else in the codebase, check for the same double-offset mistake.

### Edge Functions: the deployed set is bigger than what's in this repo
`supabase/functions/` in git only contains 4 functions (`greenp-sync-v2`, `greenp-joborder-detail-sync`, `greenp-unshipped-sync`, `enfax-inbound-daily`). The live Supabase project actually has more deployed that were never committed here, including `admin-create-account`, `admin-reset-password`, `send-ceo-email`, `enfax-ocr`, `enfax-send-discover`, `enfax-sync`, `greenp-explore`, plus a few debug ones (`greenp-login-debug*`, `greenp-menu-debug`, `test-jspdf`). **Always check `list_edge_functions` on the live project before assuming a function doesn't exist** — don't rely on the local folder alone.

`pg_cron` schedules for the sync functions are in UTC and were deliberately tuned to KST business hours (08:00–17:40): `*/10 0-7 * * *` (day), `0,10,20,30,40 8 * * *` (evening), `0,10,20,30,40,50 23 * * *` (morning KST 08:00–08:59, i.e. UTC hour 23 of the previous day) — this split exists because pg_cron can't express a single KST-aligned range directly.

### Account / permission design

Two completely separate account tables, both keyed by `auth.users.id` (Supabase Auth) — there is no shared "users" table:

- **`staff_users`**: `id, email, name, role ('staff' | 'admin'), is_active, created_at`. Used by the main app (`/`).
- **`customer_users`**: `id, email (nullable), login_id, company_name, contact_name, phone, is_active, created_at`. Used by the customer portal (`/portal`). Customers can sign up with a bare `login_id` (no email required) — the frontend maps this to a synthetic Supabase Auth email of `{login_id}@ohsungportal.local` (see `src/portal/CustomerPortalLogin.jsx`). `customer_company_aliases` lets one customer account see more than one `company_name` in greenERP data (some customers are known under multiple names there).

RLS is enforced with three `SECURITY DEFINER` SQL functions rather than per-table custom policies:

```sql
is_staff()               -- exists in staff_users, is_active
is_admin()                -- exists in staff_users, is_active, role = 'admin'
is_my_company(cn text)    -- cn matches this customer's own company_name, or a row in customer_company_aliases
```

The near-universal RLS pattern on `greenp_*` and business tables is: staff get a full-table `SELECT`/`UPDATE`/`DELETE` policy gated by `is_staff()`, customers get a row-filtered `SELECT` policy gated by `is_my_company(company_name)`, and writes are staff-only.

**Account creation is not self-service in the UI beyond the admin screen** — `AccountManagementPage.jsx` (`계정 관리`, admin-only) calls the `admin-create-account` and `admin-reset-password` Edge Functions (which use the Supabase service role under the hood, since creating `auth.users` rows requires the admin API). There is no public signup route for staff accounts.

Frontend gating (`src/App.jsx`) is layered, in order:
1. `session` (Supabase Auth) — no session → show `<Login />`.
2. Once there's a session, look the user up in `staff_users` by `id`. If not found or `is_active = false` → "⛔ 접근 권한이 없습니다" screen. This is what catches a customer account accidentally logging into the staff URL, or a legacy shared login that was never registered.
3. `myStaff.role === 'admin'` gates `adminOnly` entries in `menuGroups`/`standaloneItems` (대표님 경영보고, 계정 관리) — filtered out of the menu entirely for non-admins, not just visually disabled.
4. Non-admin staff default to the `sales` page on login instead of the admin-only `daily` (CEO report) page.

The separator kiosk (`/separator`) and customer portal (`/portal`) each have their own lightweight `*Gate.jsx` doing the equivalent of step 1–2 for their respective user table.

### Page/menu conventions worth following when adding features
- New staff-facing pages get registered in `src/App.jsx`'s `menuGroups` (grouped, role-labelled: 운영자/경리/대표님) or `standaloneItems` (customer portal, 연구실, 계정관리 — things that don't fit a role group).
- **오성철강 연구실** (`src/pages/LabPage.jsx`) is the pattern for shipping a new idea before it's "real": add one entry to the `PROJECTS` array (`key, label, icon, category, desc`, optionally `external` for a URL that opens in a new tab instead of rendering inline, and `badge` for status like `현장 배포중` / `실데이터 연동` / `샘플`). Cards auto-group by `category`. Prototype screens themselves live under `src/pages/test/`.
- **내부 시스템 링크** (`src/pages/InternalSystemsPage.jsx`) lists three tiers — `ERP2_SERVICES` (배포된 자체 서비스), `INTERNAL_SYSTEMS` (사내 서버, 별도 도메인), `EXTERNAL_SYSTEMS` (외부 업체 시스템/대시보드) — each just an array of `{icon, name, status, url, desc}` objects rendered by one shared `SystemCard`.
- Styling throughout is plain inline `style={}` objects (no CSS framework/Tailwind, no CSS modules) with a repeated color-constant-object convention (e.g. `const C = { textPrimary: '#0F1E33', ... }` at the top of each file). Match this rather than introducing a new styling approach.

### Report/deck generation (recurring request pattern in this project)
A large share of requested "development" in this project is actually producing `.pptx`/`.docx` deliverables (AX strategy decks, patch history reports, data summaries) for 대표님 보고, saved at the workspace root (not in `src/`). These are built with `pptxgenjs` via standalone Node scripts (not part of the app bundle), following an established house style: `LAYOUT_WIDE` 13.33×7.5in, a fixed navy/amber palette, `Cambria` headers + `Calibri` body, and real rasterized icons (react-icons rendered to PNG via `sharp`, not emoji — emoji glyphs don't render reliably through LibreOffice) via shared `iconCircle()`/`icon()` helpers. Every deck gets rendered to JPEG per-slide (`soffice.py --convert-to pdf` + `pdftoppm`) and visually checked before delivery, plus run through `validate.py` to catch corrupt hyperlink relationships (a known pptxgenjs gotcha: `hyperlink` must be set per text-run, not as a top-level `addText` option, when the text is an array of runs).
