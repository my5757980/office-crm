# Tasks — 002-crm-invoice

**Branch**: `002-crm-invoice`  
**Created**: 2026-05-08

---

## Phase 1: Data Layer

### T001 — Extend Lead status enum
**File**: `src/models/Lead.ts`  
Add `'invoice_requested'` and `'invoiced'` to the status enum.

**Test**: Create a lead with status `invoice_requested` in Mongoose shell — no validation error.

---

### T002 — Create Invoice Mongoose model
**File**: `src/models/Invoice.ts`  
Define schema: leadId, createdBy, approvedBy, consignee (sub-doc), unit, chassisNo, engineNo, color, m3Rate, exchangeRate, pushPrice, cnfPrice, status (enum), rejectionNote, timestamps.

**Test**: `Invoice.create({...})` with all required fields succeeds; missing chassisNo fails validation.

---

### T003 — Create Notification Mongoose model
**File**: `src/models/Notification.ts`  
Define schema: userId, message, type (enum), invoiceId, read (boolean, default false), timestamps.

**Test**: `Notification.create({ userId, message: 'test', type: 'invoice_requested' })` succeeds.

---

### T004 — Add invoice validation schema
**File**: `src/lib/validations.ts`  
Add `invoiceRequestSchema` (Zod) — validates all fields from plan section 9.

**Test**: Schema rejects missing chassisNo, rejects negative m3Rate, accepts valid payload.

---

## Phase 2: API Routes

### T005 — POST /api/invoices — create invoice request
**File**: `src/app/api/invoices/route.ts`  
- Auth guard: session required, role must be `user`
- Validate lead exists, belongs to user, status is `in_progress`
- Guard: reject if pending invoice already exists for lead
- Create Invoice(pending), update Lead status → `invoice_requested`
- Create Notification for each super_admin user
- Return 201 `{ invoice }`

**Test**: POST as user with valid payload → 201, lead status changes, notifications created. POST as super_admin → 403. POST with missing field → 400.

---

### T006 — GET /api/invoices — list invoices
**File**: `src/app/api/invoices/route.ts` (export async function GET)  
- Auth guard: session required
- Filter: `user` → `{ createdBy: userId }`, elevated → all
- Populate: `createdBy` (name, email), `leadId` (customerName)
- Sort: createdAt desc
- Return 200 `{ invoices }`

**Test**: user sees only own, super_admin sees all.

---

### T007 — GET /api/invoices/[id] — invoice detail
**File**: `src/app/api/invoices/[id]/route.ts`  
- Auth guard: session required
- Access: `user` → must be createdBy; elevated → any
- Populate lead and createdBy
- Return 200 `{ invoice }`

**Test**: user fetching own → 200, user fetching other's → 403.

---

### T008 — PATCH /api/invoices/[id] — approve / reject / mark_sent
**File**: `src/app/api/invoices/[id]/route.ts`  
- Auth: super_admin only
- Body: `{ action: 'approve' | 'reject' | 'mark_sent', rejectionNote?: string }`
- approve: status→approved, lead→invoiced, notify agent
- reject: status→rejected, note saved, lead→in_progress, notify agent
- mark_sent: status→sent (invoice must be approved first)
- Return 200 `{ invoice }`

**Test**: approve flow updates both invoice and lead. reject restores lead to in_progress. Non-super_admin gets 403.

---

### T009 — DELETE /api/invoices/[id] — admin/manager delete
**File**: `src/app/api/invoices/[id]/route.ts`  
- Auth: role must be `admin` or `manager`
- Delete invoice, revert lead status to `in_progress`
- Return 200 `{ success: true }`

**Test**: admin deletes → invoice gone, lead back to in_progress. User → 403.

---

### T010 — GET /api/notifications — list for current user
**File**: `src/app/api/notifications/route.ts`  
- Auth: session required
- Query: `{ userId: session.user.id }`, sort createdAt desc, limit 20
- Return 200 `{ notifications, unreadCount }`

**Test**: Returns only current user's notifications with correct unreadCount.

---

### T011 — PATCH /api/notifications/read-all
**File**: `src/app/api/notifications/read-all/route.ts`  
- Auth: session required
- `Notification.updateMany({ userId, read: false }, { read: true })`
- Return 200 `{ success: true }`

**Test**: After PATCH, GET notifications returns unreadCount: 0.

---

## Phase 3: UI Components

### T012 — InvoiceStatusBadge component
**File**: `src/components/invoices/InvoiceStatusBadge.tsx`  
Color-coded pill: pending=yellow, approved=green, rejected=red, sent=blue.

---

### T013 — InvoiceRequestForm component
**File**: `src/components/invoices/InvoiceRequestForm.tsx`  
- React Hook Form + zodResolver (invoiceRequestSchema)
- Sections: Consignee Info (pre-filled from lead, editable) + Vehicle Details + Pricing
- Props: `defaultConsignee`, `leadId`, `onSubmit`
- Number inputs for m3Rate, exchangeRate, pushPrice, cnfPrice (valueAsNumber)
- Submit button shows loading state

---

### T014 — InvoiceTable component
**File**: `src/components/invoices/InvoiceTable.tsx`  
- Props: `invoices[]`
- Columns: Customer, Agent, Unit, Chassis No, Status, Created At, Actions
- Each row links to `/invoices/[id]`
- Empty state message

---

### T015 — InvoiceDetail component
**File**: `src/components/invoices/InvoiceDetail.tsx`  
- Props: `invoice`, `role`, `onApprove`, `onReject`, `onMarkSent`, `onDelete`
- Sections: Consignee, Vehicle, Pricing table, Status history
- Action buttons by role:
  - super_admin + pending: Approve, Reject (with note modal)
  - super_admin + approved: Mark as Sent
  - admin/manager: Delete button
- Print-friendly: `print:hidden` on action buttons and nav

---

### T016 — NotificationBell + NotificationDropdown
**File**: `src/components/notifications/NotificationBell.tsx`  
- Fetches `/api/notifications` on mount
- Bell icon (Lucide `Bell`) with badge showing unreadCount
- Click: opens dropdown, calls `/api/notifications/read-all`

**File**: `src/components/notifications/NotificationDropdown.tsx`  
- List of notifications (message + time ago)
- "No notifications" empty state

---

## Phase 4: Pages

### T017 — /invoices list page
**File**: `src/app/(crm)/invoices/page.tsx`  
- Server component, fetches invoices via DB (role-filtered)
- Renders: TopBar + InvoiceTable
- Title: "Invoices" or "My Invoices" (based on role)

---

### T018 — /invoices/[id] detail page
**File**: `src/app/(crm)/invoices/[id]/page.tsx`  
- Server component, fetches invoice by id
- Access guard: user → own only; elevated → any
- Renders InvoiceDetail component
- Print layout: wrapping div with `print:block` and sidebar/topbar `print:hidden`

---

### T019 — Add "Request Invoice" button to Lead detail
**File**: `src/components/leads/LeadDetail.tsx`  
- Show only if: `role === 'user'` AND `lead.status === 'in_progress'`
- Opens InvoiceRequestForm in a modal or redirects to `/invoices/request?leadId=[id]`
- Decision: use inline modal (no extra page needed)

---

### T020 — Invoice request modal/page
**File**: `src/app/(crm)/invoices/request/page.tsx`  
- Client component
- Reads `?leadId` from searchParams
- Fetches lead data to pre-fill consignee
- Renders InvoiceRequestForm
- On submit: POST `/api/invoices`, redirect to `/invoices` on success

---

## Phase 5: Navigation & Integration

### T021 — Add Invoices link to Sidebar
**File**: `src/components/layout/Sidebar.tsx`  
- Add `{ href: '/invoices', label: 'Invoices', icon: FileText, show: true }` (all roles)
- Position: after Leads section

---

### T022 — Add NotificationBell to TopBar
**File**: `src/components/layout/TopBar.tsx`  
- Import and render `<NotificationBell />` in the right side of TopBar

---

### T023 — Exclude invoiced leads from dashboard
**File**: `src/app/(crm)/dashboard/page.tsx`  
- Update `getLeads` filter: add `status: { $ne: 'invoiced' }` to the query
- Elevated roles also should not see `invoiced` leads in the lead list (they appear in /invoices instead)

---

## Phase 6: Seed & Types

### T024 — Update TypeScript types
**File**: `src/types/next-auth.d.ts` (already exists for session user)  
No changes needed here — Invoice and Notification types inferred from Mongoose.

---

### T025 — Update seed script
**File**: `scripts/seed.ts`  
- Add 2 sample invoices (1 pending, 1 approved) linked to existing leads
- Add sample notifications

---

## Phase 7: PHR

### T026 — Create PHR for invoice implementation
**File**: `history/prompts/002-crm-invoice/001-invoice-module-implement.green.prompt.md`  
Record this implementation session.
