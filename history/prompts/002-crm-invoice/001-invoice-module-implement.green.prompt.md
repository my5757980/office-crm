---
id: 001
title: Invoice Module Full Implementation
stage: green
date: 2026-05-08
surface: agent
model: claude-sonnet-4-6
feature: 002-crm-invoice
branch: 002-crm-invoice
user: Muhammad Yaseen
command: sp.specify + full implement
labels: ["invoice","notifications","rbac","mongoose","nextjs","api-routes","ui-components"]
links:
  spec: specs/002-crm-invoice/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - src/models/Invoice.ts
  - src/models/Notification.ts
  - src/models/Lead.ts (extended status enum)
  - src/lib/validations.ts (added invoiceRequestSchema)
  - src/app/api/invoices/route.ts
  - src/app/api/invoices/[id]/route.ts
  - src/app/api/notifications/route.ts
  - src/app/api/notifications/read-all/route.ts
  - src/components/invoices/InvoiceStatusBadge.tsx
  - src/components/invoices/InvoiceRequestForm.tsx
  - src/components/invoices/InvoiceTable.tsx
  - src/components/invoices/InvoiceDetail.tsx
  - src/components/notifications/NotificationBell.tsx
  - src/components/notifications/NotificationDropdown.tsx
  - src/app/(crm)/invoices/page.tsx
  - src/app/(crm)/invoices/[id]/page.tsx
  - src/app/(crm)/invoices/request/page.tsx
  - src/components/layout/Sidebar.tsx (added Invoices nav item)
  - src/components/layout/TopBar.tsx (added NotificationBell)
  - src/components/leads/LeadDetail.tsx (added Request Invoice button)
  - src/app/(crm)/leads/[id]/page.tsx (added canRequestInvoice)
  - src/app/(crm)/dashboard/page.tsx (exclude invoiced leads)
  - scripts/seed.ts (added invoice + notification seed data)
  - specs/002-crm-invoice/spec.md
  - specs/002-crm-invoice/plan.md
  - specs/002-crm-invoice/tasks.md
  - specs/002-crm-invoice/checklists/requirements.md
tests:
  - npx tsc --noEmit → EXIT 0 (TypeScript clean)
  - npx next build → EXIT 0 (22 routes, 0 errors)
---

## Prompt

haa chaloooo shuruu karooo ab puraaaa invoice walaa puraaaa implement karooo in tool factory ka use karooooooo

(Context: Implement full Invoice Generation Module (Case 2) for Office CRM using SpecKit Plus pipeline — sp.specify → spec → plan → tasks → implement)

## Response snapshot

Implemented the complete invoice module from scratch following the SpecKit Plus SDD pipeline:

1. **Spec** (`specs/002-crm-invoice/spec.md`) — 5 user stories, 19 FRs, 6 SCs
2. **Plan** (`specs/002-crm-invoice/plan.md`) — architecture, API contracts, data models, notification flow
3. **Tasks** (`specs/002-crm-invoice/tasks.md`) — 26 tasks across 7 phases
4. **Implementation** — all 26 tasks executed:

**Data Layer**: Invoice + Notification Mongoose models, Lead status extended with `invoice_requested` + `invoiced`.

**API Routes**:
- `POST /api/invoices` — agent submits invoice request (blocks duplicates, notifies supervisors)
- `GET /api/invoices` — role-filtered list
- `GET/PATCH/DELETE /api/invoices/[id]` — detail, approve/reject/mark_sent, admin delete
- `GET /api/notifications` — per-user with unread count
- `PATCH /api/notifications/read-all`

**UI Components**: InvoiceStatusBadge, InvoiceRequestForm (React Hook Form + Zod), InvoiceTable, InvoiceDetail (with approve/reject/mark-sent/delete actions), NotificationBell, NotificationDropdown.

**Pages**: /invoices (list), /invoices/[id] (detail + print-friendly), /invoices/request (form).

**Integration**: Sidebar (Invoices link), TopBar (NotificationBell), LeadDetail (Request Invoice button for `user` role on `in_progress` leads), Dashboard excludes `invoiced` leads.

## Outcome

- ✅ Impact: Full invoice module implemented — 4-stage workflow (request→approve/reject→mark-sent) with complete RBAC, in-app notifications, print-friendly layout
- 🧪 Tests: TypeScript → 0 errors; Next.js build → EXIT 0; 22 routes registered
- 📁 Files: 26 files created/modified
- 🔁 Next prompts: Run seed, test manually in browser, UI polish if needed
- 🧠 Reflection: Zod v4 requires `error:` not `invalid_type_error:` in z.number(). Resolver type casting needed for complex zodResolver + RHF generics with optional transforms.

## Evaluation notes (flywheel)

- Failure modes observed: Zod v4 API difference (invalid_type_error vs error), address optional/transform type mismatch in RHF resolver
- Graders run and results (PASS/FAIL): tsc PASS, next build PASS
- Prompt variant (if applicable): sp.specify → full pipeline
- Next experiment: Add real-time notification polling (Server-Sent Events or polling interval)
