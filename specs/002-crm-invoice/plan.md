# Architecture Plan — 002-crm-invoice

**Branch**: `002-crm-invoice`  
**Created**: 2026-05-08  
**Status**: Approved

---

## 1. Scope

**In Scope**:
- Invoice request form (agent)
- Supervisor approve/reject flow
- Mark as sent
- Admin/manager delete
- In-app notifications (bell + dropdown)
- Invoice list and detail pages
- Lead status transitions (invoice_requested → invoiced)
- Print-friendly invoice detail layout

**Out of Scope**:
- PDF file generation
- Email notifications
- Payment tracking
- Sequential invoice numbers

---

## 2. Data Models

### Invoice Model (`src/models/Invoice.ts`)

```typescript
{
  leadId:        ObjectId (ref: Lead, required)
  createdBy:     ObjectId (ref: User, required)
  approvedBy:    ObjectId (ref: User, optional)
  
  // Consignee
  consignee: {
    name:    String (required)
    address: String
    phone:   String (required)
    country: String (required)
    port:    String (required)
  }
  
  // Vehicle
  unit:       String (required)
  chassisNo:  String (required)
  engineNo:   String (required)
  color:      String (required)
  
  // Pricing
  m3Rate:       Number (required)
  exchangeRate: Number (required)
  pushPrice:    Number (required)
  cnfPrice:     Number (required)
  
  // Lifecycle
  status:        enum ['pending','approved','rejected','sent'] default:'pending'
  rejectionNote: String
  
  timestamps: true
}
```

### Notification Model (`src/models/Notification.ts`)

```typescript
{
  userId:    ObjectId (ref: User, required)
  message:   String (required)
  type:      enum ['invoice_requested','invoice_approved','invoice_rejected']
  invoiceId: ObjectId (ref: Invoice, optional)
  read:      Boolean default: false
  timestamps: true
}
```

### Lead Model Extension

Add to status enum: `'invoice_requested'`, `'invoiced'`
(Existing: `'new'`, `'contacted'`, `'in_progress'`, `'closed'`)

---

## 3. API Contracts

### POST /api/invoices
- Auth: session required, role must be `user`
- Body: consignee + vehicle + pricing fields
- Guard: lead must exist, belong to user, status must be `in_progress`
- Guard: no existing `pending` invoice for this lead
- Action: create Invoice(pending), update Lead(invoice_requested), create Notifications for all super_admins
- Response 201: `{ invoice }`

### GET /api/invoices
- Auth: session required
- Filter: if `user` → `{ createdBy: userId }`, else all
- Response 200: `{ invoices }`

### GET /api/invoices/[id]
- Auth: session required
- Access: user → own only; elevated → all
- Response 200: `{ invoice, lead }`

### PATCH /api/invoices/[id]
- Auth: session required
- Actions dispatched via `action` field in body:
  - `approve` → super_admin only → status:approved, lead:invoiced, notify agent
  - `reject` → super_admin only → status:rejected, note saved, lead:in_progress, notify agent
  - `mark_sent` → super_admin only → status:sent
- Response 200: `{ invoice }`

### DELETE /api/invoices/[id]
- Auth: session required, role must be `admin` or `manager`
- Action: delete invoice, revert lead status to `in_progress`
- Response 200: `{ success: true }`

### GET /api/notifications
- Auth: session required
- Returns: notifications for current user, sorted by createdAt desc, limit 20
- Response 200: `{ notifications, unreadCount }`

### PATCH /api/notifications/read-all
- Auth: session required
- Action: mark all user's notifications as read
- Response 200: `{ success: true }`

---

## 4. Page Structure

```
src/app/
  (crm)/
    invoices/
      page.tsx              ← Invoice list
      [id]/
        page.tsx            ← Invoice detail (print-friendly)
        
  api/
    invoices/
      route.ts              ← GET list, POST create
      [id]/
        route.ts            ← GET detail, PATCH action, DELETE
    notifications/
      route.ts              ← GET list
      read-all/
        route.ts            ← PATCH mark all read
```

---

## 5. Component Structure

```
src/components/
  invoices/
    InvoiceRequestForm.tsx   ← React Hook Form + Zod, consignee + vehicle + pricing
    InvoiceTable.tsx         ← Sortable list with status badges
    InvoiceDetail.tsx        ← Full detail view, action buttons by role
    InvoiceStatusBadge.tsx   ← Color-coded pill (pending=yellow, approved=green, rejected=red, sent=blue)
  
  notifications/
    NotificationBell.tsx     ← Bell icon + unread count badge, opens dropdown
    NotificationDropdown.tsx ← List of recent notifications, mark-all-read button
```

---

## 6. Lead Status Transitions

```
in_progress
    ↓ (agent submits invoice request)
invoice_requested
    ↓ (supervisor approves)
invoiced
    ↑ (supervisor rejects OR admin deletes invoice → reverts)
in_progress
```

**Dashboard filter**: `Lead.find({ status: { $nin: ['invoiced', 'invoice_requested'] } })` for non-elevated users, and elevated users see all except invoiced.

Wait — per spec: invoiced leads do NOT appear in lead list. So dashboard query should exclude `invoiced`. `invoice_requested` leads SHOULD still appear (they're still leads waiting approval).

Final dashboard filter for leads:
- All roles: exclude `status: 'invoiced'`
- Non-elevated: also filter by `createdBy: userId`

---

## 7. Notification Flow

**On invoice request (agent submits)**:
- Find all `super_admin` users → create Notification per user
- Message: `"New invoice request from {agentName} for {customerName}"`

**On approve**:
- Create Notification for `createdBy` user of invoice
- Message: `"Your invoice for {customerName} has been approved"`

**On reject**:
- Create Notification for `createdBy` user
- Message: `"Your invoice for {customerName} has been rejected: {rejectionNote}"`

**NotificationBell** (in TopBar):
- Fetches `/api/notifications` on mount
- Shows unread count badge
- Clicking opens dropdown, calls `/api/notifications/read-all`

---

## 8. Print Layout

Invoice detail page uses CSS `@media print`:
- Hide: sidebar, topbar, action buttons, nav links
- Show: clean invoice layout with company header placeholder, all vehicle + pricing data
- Use `print:hidden` Tailwind class on non-printable elements

---

## 9. Validation Schema (Zod)

```typescript
// src/lib/validations.ts additions

export const invoiceRequestSchema = z.object({
  leadId: z.string().min(1),
  consignee: z.object({
    name:    z.string().min(1),
    address: z.string().optional().default(''),
    phone:   z.string().min(1),
    country: z.string().min(1),
    port:    z.string().min(1),
  }),
  unit:         z.string().min(1),
  chassisNo:    z.string().min(1),
  engineNo:     z.string().min(1),
  color:        z.string().min(1),
  m3Rate:       z.number().positive(),
  exchangeRate: z.number().positive(),
  pushPrice:    z.number().positive(),
  cnfPrice:     z.number().positive(),
});
```

---

## 10. Sidebar Navigation Update

Add to Sidebar.tsx:
- `/invoices` — "Invoices" link — show for ALL roles
- Different label/icon from lead section

---

## 11. Risk Analysis

1. **Lead status race condition**: Two requests approving/rejecting same invoice simultaneously → use findOneAndUpdate with status check condition.
2. **Notification volume**: If many super_admins, a single invoice request creates N notifications. Acceptable at current scale.
3. **Print layout cross-browser**: Print CSS varies by browser. Test in Chrome. Use `@page` CSS for margins.
