# Research: Office CRM Lead Generation

**Feature**: 001-crm-lead-generation
**Date**: 2026-05-02

---

## Decision 1: Next.js App Router + Server Components for RBAC

**Decision**: Use Next.js 15 App Router with Server Components for all data-fetching pages. API routes enforce RBAC server-side.

**Rationale**: Server Components never expose sensitive data to the client. RBAC checks in API route handlers (not middleware alone) ensure a user cannot bypass access by crafting direct fetch calls.

**Pattern**:
```
GET /api/leads → checks session.user.role
  role=user   → filter { createdBy: session.user.id }
  role=admin/manager/super_admin → no filter
```

---

## Decision 2: NextAuth v5 JWT + Split Config (Edge-safe)

**Decision**: Split auth into `auth.config.ts` (edge-safe, no Mongoose) and `auth.ts` (Node.js, with Mongoose). Middleware imports only `auth.config.ts`.

**Rationale**: Mongoose uses Node.js APIs not available in Vercel Edge Runtime. Splitting prevents build failures. Proven pattern from sbk-autotrading-auth project.

**Files**:
- `src/lib/auth.config.ts` — edge-safe, no DB imports
- `src/lib/auth.ts` — full NextAuth with CredentialsProvider + Mongoose
- `src/middleware.ts` — imports auth.config.ts only

---

## Decision 3: Country→Port via Client-Side JSON Import

**Decision**: Import `countries_ports.json` directly in the LeadForm component. No API call needed.

**Rationale**: 218 countries, static data (~150KB). Imported once at bundle time. On country select, filter ports client-side instantly. Zero network latency.

**Logic**:
```typescript
const ports = countriesPorts[selectedCountry]?.ports ?? []
if (ports.length === 1) autoSetPort(ports[0])  // auto-select
else showPortDropdown(ports)                    // show options
```

---

## Decision 4: Mongoose Models with Soft-Delete for Users

**Decision**: User model uses `isActive: Boolean` for deactivation (no hard delete). Leads keep `createdBy` reference intact.

**Rationale**: Preserves data integrity. Deactivated users' leads remain visible to admins. Login check: `if (!user.isActive) throw Error("Account deactivated")`.

---

## Decision 5: Chat (Message) — Append-Only, Polling

**Decision**: Messages stored in separate MongoDB collection with `leadId` reference. Chat section fetches all messages for a lead. No WebSockets — page refresh updates chat.

**Rationale**: Simpler implementation, no infrastructure cost. Internal office tool — real-time not required per spec (A2 assumption).

---

## Decision 6: UI Layout — Dark Sidebar + Light Content

**Decision**: Fixed dark sidebar (240px), scrollable white content area. Tailwind v4 CSS variables for theming.

**Sidebar links**:
- Dashboard (all roles)
- New Lead (all roles)
- All Leads (admin/manager/super_admin)
- Users (super_admin only)

---

## Decision 7: Zod v4 + React Hook Form

**Decision**: Use Zod v4 schemas WITHOUT `.default()` (causes type mismatch with @hookform/resolvers v5). Use `defaultValues` in `useForm()` instead.

**Rationale**: Known issue from sbk-autotrading-auth. Removing `.default()` from Zod schemas fixes TypeScript errors.
