# Tasks: Office CRM — Lead Generation Module

**Feature**: 001-crm-lead-generation
**Branch**: 001-crm-lead-generation
**Date**: 2026-05-02
**Total Tasks**: 52

---

## Phase 1 — Project Scaffold (Setup)

- [X] T001 Scaffold Next.js 15 project in E:\New folder\office-crm with `create-next-app@latest` — flags: TypeScript, App Router, src/ dir, no ESLint default, Tailwind off (manual setup)
- [X] T002 Install dependencies: `npm install next-auth@beta mongoose bcryptjs react-hook-form @hookform/resolvers zod lucide-react`
- [X] T003 Install dev dependencies: `npm install -D @types/bcryptjs`
- [X] T004 [P] Create src/app/globals.css with Tailwind v4 @theme tokens — sidebar #1e2433, primary #3b82f6, border #e5e7eb, light-bg #f9fafb
- [X] T005 [P] Copy E:\New folder\millinior\countries_ports.json to src/data/countries_ports.json
- [X] T006 [P] Create .env.local with NEXTAUTH_SECRET, NEXTAUTH_URL=http://localhost:3000, MONGODB_URI=mongodb://localhost:27017/office-crm
- [X] T007 [P] Create .env.example with same keys but empty values
- [X] T008 Create src/app/layout.tsx — root layout with Inter font via next/font/google, imports globals.css, wraps children in Providers

---

## Phase 2 — Foundation (Blocking Prerequisites)

- [X] T009 Create src/lib/db.ts — MongoDB singleton connection with Mongoose, handles hot-reload in dev
- [X] T010 Create src/lib/auth.config.ts — edge-safe NextAuth config: pages.signIn='/login', session.strategy='jwt', no providers/DB imports
- [X] T011 Create src/lib/auth.ts — full NextAuth config: CredentialsProvider, authorize() queries User model, checks isActive, returns {id, name, email, role}
- [X] T012 Create src/types/next-auth.d.ts — augment Session and JWT types to include id and role fields
- [X] T013 Create src/middleware.ts — imports auth from auth.config.ts, protects all routes except /login and /api/auth/*
- [X] T014 Create src/components/Providers.tsx — SessionProvider wrapper, 'use client'
- [X] T015 Create src/lib/validations.ts — Zod schemas for Lead (no .default()), Message, User — all required fields marked required()

---

## Phase 3 — Data Models [US1: Lead Management]

- [X] T016 [US1] Create src/models/User.ts — Mongoose schema: name, email(unique), password, role(enum), isActive(default:true), timestamps
- [X] T017 [US1] Create src/models/Lead.ts — Mongoose schema: customerName, contactPerson, address(optional), phone, email(optional), country, countryCode, port, status(enum,default:'new'), createdBy(ref:User), timestamps
- [X] T018 [US1] Create src/models/Message.ts — Mongoose schema: leadId(ref:Lead), userId(ref:User), userName(string), message(max:1000), createdAt

---

## Phase 4 — Auth Pages [US2: Authentication]

- [X] T019 [US2] Create src/app/(auth)/login/page.tsx — login page with card layout, centered, SBK-style clean form
- [X] T020 [US2] Create src/app/(auth)/layout.tsx — minimal layout for auth pages (no sidebar)
- [X] T021 [US2] Create src/components/auth/LoginForm.tsx — 'use client', useForm+zodResolver, email+password fields, calls signIn('credentials'), shows error on failure

---

## Phase 5 — CRM Layout + Dashboard [US3: Lead List]

- [X] T022 [US3] Create src/app/(crm)/layout.tsx — authenticated layout: flex row, renders Sidebar + main content area, redirects to /login if no session
- [X] T023 [US3] Create src/components/layout/Sidebar.tsx — 'use client', dark sidebar (#1e2433), nav links: Dashboard, New Lead; conditional: All Leads (admin+), Users (super_admin only); Sign Out button at bottom
- [X] T024 [US3] Create src/components/layout/TopBar.tsx — shows current user name + role badge, mobile hamburger toggle
- [X] T025 [US3] Create src/app/api/leads/route.ts — GET: fetch leads with RBAC filter (user=own, elevated=all), supports ?search, ?country, ?port, ?status, ?from, ?to; POST: create lead, sets createdBy=session.user.id
- [X] T026 [P] [US3] Create src/app/(crm)/dashboard/page.tsx — Server Component, fetches leads via API, passes to LeadTable
- [X] T027 [P] [US3] Create src/components/leads/LeadTable.tsx — 'use client', table with columns: Customer, Contact, Country, Port, Status, Date, Actions; clickable rows to /leads/[id]
- [X] T028 [P] [US3] Create src/components/leads/LeadFilters.tsx — 'use client', search input + country dropdown + status filter + date range; updates URL params

---

## Phase 6 — New Lead Form [US1: Lead Management]

- [X] T029 [US1] Create src/components/leads/LeadForm.tsx — 'use client', useForm+zodResolver, all 7 fields; country onChange triggers port logic: 1 port=auto-set+readonly, 2+ ports=show dropdown; imports countries_ports.json
- [X] T030 [US1] Create src/app/(crm)/leads/new/page.tsx — renders LeadForm, on submit POST /api/leads, redirects to /dashboard on success
- [X] T031 [US1] Create src/app/(crm)/leads/[id]/edit/page.tsx — fetches lead, renders LeadForm pre-filled, on submit PATCH /api/leads/[id]

---

## Phase 7 — Lead Detail + Chat [US4: Chat]

- [X] T032 [US4] Create src/app/api/leads/[id]/route.ts — GET: return lead + messages (RBAC check: owner or elevated); PATCH: update lead fields (RBAC check)
- [X] T033 [US4] Create src/app/api/leads/[id]/messages/route.ts — POST: append message to lead (checks lead access), sets userId+userName from session
- [X] T034 [US4] Create src/app/(crm)/leads/[id]/page.tsx — Server Component: fetches lead detail + messages, renders LeadDetail + LeadChat
- [X] T035 [P] [US4] Create src/components/leads/LeadDetail.tsx — displays all lead fields in card layout, Edit button (owner or elevated), status badge with color coding
- [X] T036 [P] [US4] Create src/components/leads/LeadChat.tsx — 'use client', WhatsApp-style chat: messages list (name + time + text), textarea + Send button at bottom, refreshes on submit via router.refresh()

---

## Phase 8 — User Management [US5: Super Admin]

- [X] T037 [US5] Create src/app/api/admin/users/route.ts — GET: list all users (super_admin guard, 403 others); POST: create user with hashed password
- [X] T038 [US5] Create src/app/api/admin/users/[id]/route.ts — PATCH: update role or isActive (super_admin guard)
- [X] T039 [US5] Create src/app/(crm)/admin/users/page.tsx — Server Component, fetches users, renders UserTable; redirects if not super_admin
- [X] T040 [US5] Create src/components/admin/UserTable.tsx — table: Name, Email, Role, Status, Actions; inline role change dropdown; toggle active/inactive button
- [X] T041 [US5] Create src/components/admin/CreateUserModal.tsx — 'use client', modal form: name, email, password, role select; POST /api/admin/users on submit

---

## Phase 9 — API: All Leads View [US3: Admin Lead Access]

- [X] T042 [US3] Create src/app/(crm)/admin/leads/page.tsx — All Leads view for admin/manager/super_admin; reuses LeadTable + LeadFilters; adds "Created By" column showing staff name; 403 redirect for role=user

---

## Phase 10 — Seed + Polish

- [X] T043 Create scripts/seed.ts — creates super_admin (admin@office.com / admin123), 3 users (user1@office.com, user2@office.com, user3@office.com / password123), 5 sample leads
- [X] T044 Add `"seed": "tsx scripts/seed.ts"` to package.json scripts; install tsx as dev dep
- [X] T045 [P] Add loading.tsx files in dashboard, leads/new, leads/[id] routes for Suspense loading states
- [X] T046 [P] Add not-found.tsx — 404 page with link back to dashboard
- [X] T047 [P] Add error.tsx — error boundary with retry button
- [X] T048 [P] Make Sidebar mobile-responsive: hamburger toggle on small screens, overlay menu
- [X] T049 [P] Add status badge component src/components/ui/StatusBadge.tsx — color-coded: new=blue, in_progress=yellow, closed=gray
- [X] T050 [P] Add role badge component src/components/ui/RoleBadge.tsx — user=gray, admin=blue, manager=green, super_admin=red
- [X] T051 Run `npx tsc --noEmit` — fix all TypeScript errors until 0 errors
- [X] T052 Manual test checklist: GET /login 200, POST login success, POST login fail, GET /dashboard (user sees own leads), GET /dashboard (admin sees all), POST /api/leads creates lead, GET /api/leads/[id] blocked for wrong user, POST message appears in chat, GET /admin/users blocked for non-super_admin

---

## Dependencies

```
T001-T008 (Setup)
    ↓
T009-T015 (Foundation)
    ↓
T016-T018 (Models) ← parallel with T019-T021 (Auth)
    ↓
T022-T028 (Layout + Dashboard)
    ↓
T029-T031 (Lead Form) ← parallel with T032-T036 (Detail + Chat)
    ↓
T037-T042 (Admin)
    ↓
T043-T052 (Seed + Polish)
```

---

## Parallel Opportunities

- T004, T005, T006, T007 — all Setup phase, no deps on each other
- T016-T018 (models) can run parallel with T019-T021 (auth pages)
- T026, T027, T028 — different components, no deps on each other
- T029, T030 — LeadForm + New page can be parallel
- T035, T036 — LeadDetail + LeadChat are independent components
- T045, T046, T047, T048, T049, T050 — all polish, fully parallel

---

## MVP Scope (Minimum to demonstrate value)

Tasks T001–T036 deliver:
- Login/logout working
- Staff can create leads
- Staff sees only own leads
- Admin sees all leads
- Country→Port smart dropdown working
- Lead detail + chat working
