# Implementation Plan: Office CRM — Lead Generation Module

**Branch**: `001-crm-lead-generation` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)

---

## Summary

Internal CRM portal for 15 office staff. Staff add customer leads, see only their own. Admins/managers see all leads. Per-lead WhatsApp-style chat. Country→Port smart dropdown (218 countries). Built with Next.js 15 App Router, MongoDB, NextAuth v5, Tailwind v4.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15, NextAuth v5, Mongoose 8, Tailwind v4, React Hook Form, Zod v4, bcryptjs, lucide-react
**Storage**: MongoDB Atlas (free tier)
**Testing**: Manual HTTP + TypeScript tsc --noEmit
**Target Platform**: Vercel (production) + localhost (dev)
**Project Type**: Next.js 15 App Router, src/ directory
**Performance Goals**: Page load < 2s, form submit < 1s
**Constraints**: Edge-safe middleware (no Mongoose in edge), RBAC server-side only
**Scale/Scope**: 15 users, ~1000 leads/month

---

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout + Providers
│   ├── globals.css             # Tailwind v4 @theme tokens
│   ├── (auth)/
│   │   └── login/page.tsx      # Login page
│   ├── (crm)/
│   │   ├── layout.tsx          # Sidebar layout (authenticated)
│   │   ├── dashboard/page.tsx  # Lead list
│   │   ├── leads/
│   │   │   ├── new/page.tsx    # New lead form
│   │   │   └── [id]/page.tsx   # Lead detail + chat
│   │   └── admin/
│   │       └── users/page.tsx  # User management
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── leads/
│       │   ├── route.ts        # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts    # GET detail, PATCH update
│       │       └── messages/route.ts  # POST chat message
│       └── admin/
│           └── users/
│               ├── route.ts    # GET list, POST create
│               └── [id]/route.ts  # PATCH update
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   ├── leads/
│   │   ├── LeadForm.tsx        # New/Edit lead form with country→port
│   │   ├── LeadTable.tsx       # Lead list table
│   │   ├── LeadFilters.tsx     # Search + filter bar
│   │   └── LeadChat.tsx        # WhatsApp-style chat
│   └── admin/
│       └── UserTable.tsx
├── lib/
│   ├── auth.config.ts          # Edge-safe NextAuth config
│   ├── auth.ts                 # Full NextAuth + Mongoose
│   ├── db.ts                   # MongoDB singleton
│   └── validations.ts          # Zod schemas
├── models/
│   ├── User.ts
│   ├── Lead.ts
│   └── Message.ts
├── data/
│   └── countries_ports.json    # 218 countries + ports (static)
├── types/
│   └── next-auth.d.ts          # Session type augmentation
├── middleware.ts               # Edge auth guard
└── Providers.tsx               # SessionProvider wrapper
```

---

## Implementation Phases

### Phase A — Project Scaffold (Tasks 1–8)
- create-next-app scaffold with src/ directory
- Install dependencies
- Setup globals.css with Tailwind v4 @theme tokens
- Copy countries_ports.json to src/data/
- Setup MongoDB connection (db.ts)
- Setup NextAuth split config (auth.config.ts + auth.ts)
- Setup middleware.ts
- Augment NextAuth session types

### Phase B — Data Models (Tasks 9–12)
- User model (name, email, password, role, isActive)
- Lead model (all fields + createdBy ref)
- Message model (leadId, userId, userName, message)
- Zod validation schemas

### Phase C — API Routes (Tasks 13–20)
- Auth route (NextAuth handler)
- GET/POST /api/leads (RBAC filter)
- GET/PATCH /api/leads/[id] (ownership check)
- POST /api/leads/[id]/messages
- GET/POST /api/admin/users (super_admin guard)
- PATCH /api/admin/users/[id]

### Phase D — UI Components (Tasks 21–30)
- Login page + form
- Sidebar layout with role-based nav links
- Dashboard (lead table + filters + search)
- New Lead form (country→port smart dropdown)
- Lead detail page + chat section
- Admin Users page

### Phase E — Polish + Seed (Tasks 31–35)
- Responsive mobile styles
- Loading states and error messages
- Seed script (super_admin + 3 test users)
- TypeScript check (tsc --noEmit)
- Manual route testing

---

## RBAC Implementation Pattern

```typescript
// Every API route:
const session = await auth()
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

const isElevated = ['admin', 'manager', 'super_admin'].includes(session.user.role)
const filter = isElevated ? {} : { createdBy: session.user.id }

const leads = await Lead.find(filter)
```

---

## Country→Port Logic (Client-Side)

```typescript
import countriesPorts from '@/data/countries_ports.json'

const countryList = Object.keys(countriesPorts).sort()

function onCountryChange(country: string) {
  const ports = countriesPorts[country]?.ports ?? []
  if (ports.length === 1) {
    setValue('port', ports[0])  // auto-select
    setPortLocked(true)         // read-only display
  } else {
    setValue('port', '')
    setPortLocked(false)        // show dropdown
  }
}
```

---

## Color Tokens (Tailwind v4)

```css
@theme {
  --color-sidebar: #1e2433;
  --color-sidebar-hover: #2a3347;
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-danger: #ef4444;
  --color-text-body: #374151;
  --color-border: #e5e7eb;
  --color-light-bg: #f9fafb;
}
```
