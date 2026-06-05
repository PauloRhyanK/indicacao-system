# CAIS — Sistema de Indicação de Consórcios

An internal CRM + gamified referral tracker for a Brazilian consortium sales team. Built natively on this project's stack: **TanStack Router** (file-based routing), **Tailwind v4** (CSS-first tokens), **Lovable Cloud** (auth + Postgres + RLS), **React Query**, **Recharts**.

All your URLs, design tokens, components, and features are preserved — only the underlying mechanics are adapted to the template.

## Decisions locked in
- Adapt to template stack (TanStack/Tailwind v4/Lovable Cloud).
- All authenticated users see everything (Configurações visible to all; no role gating in MVP, but roles still stored properly in a separate table for future use).
- Seed data only — leads/sales/referrals/meta seeded; you create your own login via the register page.
- Registrar Venda auto-sets lead status to `Convertido` and counts toward meta/volume.

---

## 1. Backend (Lovable Cloud)
Enable Cloud, then one migration creating:
- `profiles` (id→auth.users, name, created_at) + auto-create trigger on signup
- `user_roles` (separate table, `app_role` enum admin/assessor/gestor) + `has_role()` security-definer fn (stored for future gating, not enforced in MVP)
- `leads`, `referrals` (polymorphic user|lead), `sales`, `meta_periods`
- `get_referral_chain(p_lead_id)` recursive CTE RPC for the upward referral chain
- A trigger (or server-fn logic) so inserting a sale flips the lead to `Convertido`
- GRANTs for every table; RLS enabled. Policies: authenticated users can read/write all rows (per your "everyone sees everything" choice).

Seed data inserted via the data tool: 3 demo profiles (Ana/Pedro/Maria — as profile rows referenced by leads/sales), 15 leads across statuses, 5 referral chains (2 multi-level lead→lead→user), 3 sales, 1 meta period (R$500.000 target, ~R$312.000 sold).

## 2. Design system (`src/styles.css`)
- Load **General Sans** via `<link>` in `__root.tsx` head (not CSS @import — Tailwind v4 rule).
- Add all CAIS color tokens under `@theme` (azul-profundo, ouro, slate-*, status-*, etc.), generating `bg-ouro`, `text-azul-profundo`, etc.
- Define utility classes / component variants for buttons (primary/gold/ghost), badges (green/amber/red/gray/gold), inputs, tab nav, section headers, pitch block.

## 3. Shared components (`src/components/`)
`Button` (cva variants), `Badge` (status-mapped), `KPICard` (gold left-accent), `DataTable`, `StatusBadge`, `AppLayout` (top nav + sidebar desktop / bottom tabs mobile), `SlideOver`, `Spinner`, `EmptyState`, `ReferralChain`.

## 4. Auth (`/login`, `/register`)
Centered card on azul-profundo gradient, CAIS-styled inputs, email+password via Cloud auth. `__root` wires a single `onAuthStateChange`. Authenticated app routes live under `src/routes/_authenticated/` (managed gate redirects to `/login`). Redirect to `/dashboard` after login.

## 5. Routes (mapped to TanStack file-based routing)
```text
/login, /register            -> public
/dashboard                   -> _authenticated/dashboard
/leads                       -> _authenticated/leads.index
/leads/$id                   -> _authenticated/leads.$id
/indicacoes                  -> _authenticated/indicacoes
/configuracoes               -> _authenticated/configuracoes
```
Data fetched via `createServerFn` + React Query (`ensureQueryData` in loader, `useSuspenseQuery` in component). URL filters via `validateSearch`.

## 6. Modules
- **Dashboard:** hero greeting, animated meta progress bar (ouro fill), 4 KPI cards (Total Leads, Convertidos, Taxa de Conversão, Volume Vendido), Recharts conversion-funnel BarChart, "Top Indicadores do Mês" leaderboard.
- **Leads:** filterable/searchable DataTable, status badges, 3-dot actions (Ver/Editar/Registrar Venda), "Novo Lead" gold button → SlideOver form with referrer autocomplete (user OR lead).
- **Lead detail:** header + status, Dados do Lead, **Árvore de Indicações** (horizontal node chain via `get_referral_chain`, this-lead highlighted gold, >4 levels collapses with expand), Histórico timeline, Registrar Venda (gold) when not converted.
- **Registrar Venda:** dialog capturing sale_value → inserts sale, auto-converts lead, refreshes KPIs/meta.
- **Configurações:** basic settings/meta period view (visible to all).

## 7. Micro-interactions & responsive
Fade-in page transitions, row/button/KPI hover states, 1s progress-bar width animation, spinner/empty states. Mobile: bottom tabs + 2-col KPI grid + horizontal-scroll tables. Desktop: 240px sidebar.

---

## Technical notes
- No `tailwind.config.ts` — tokens go in `src/styles.css` `@theme` (Tailwind v4).
- Recursive referral query implemented as a Postgres RPC called through a server function.
- Sale→conversion enforced in DB trigger so it's consistent regardless of caller.
- Build order follows your list: tokens/components → auth → dashboard → leads → detail/tree → new-lead form → sale flow.

I'll verify the build and seeded data render correctly before wrapping up.