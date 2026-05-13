# Feature Specification: Invoice Generation Module

**Feature Branch**: `002-crm-invoice`  
**Created**: 2026-05-08  
**Status**: Draft  
**Project**: Office CRM (Case 2)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent Raises Invoice Request (Priority: P1)

An agent views their own approved lead (status: in_progress) and clicks "Request Invoice". They fill in vehicle details and consignee info. On submit, the lead status changes to `invoice_requested` and an in-app notification is sent to the supervisor.

**Why this priority**: This is the entry point of the entire invoice workflow. Without it, nothing downstream can execute.

**Independent Test**: Log in as a `user` role account, open an `in_progress` lead, fill and submit the invoice request form, verify lead status changes to `invoice_requested`.

**Acceptance Scenarios**:

1. **Given** a user is logged in and viewing their own lead with status `in_progress`, **When** they click "Request Invoice" and submit the form with all required vehicle fields, **Then** an Invoice document is created with status `pending`, the lead status becomes `invoice_requested`, and a notification is delivered to all `super_admin` users.
2. **Given** a user tries to submit the form with missing required fields (e.g., chassisNo empty), **When** they click Submit, **Then** the form shows inline validation errors and no invoice is created.
3. **Given** a lead already has status `invoice_requested` or `invoiced`, **When** the agent views that lead, **Then** the "Request Invoice" button is hidden.

---

### User Story 2 — Supervisor Reviews and Approves/Rejects (Priority: P1)

The supervisor (super_admin) opens the `/invoices` page, sees all pending invoice requests, clicks into one, reviews the details, and either approves or rejects it with an optional rejection note.

**Why this priority**: Supervisor approval is the gating action — without it agents can never get a final invoice.

**Independent Test**: Log in as `super_admin`, open `/invoices`, find a `pending` invoice, approve it, verify invoice status changes to `approved` and agent receives notification.

**Acceptance Scenarios**:

1. **Given** a supervisor is on `/invoices/[id]` and the invoice is `pending`, **When** they click "Approve", **Then** invoice status → `approved`, lead status → `invoiced`, agent receives "Invoice approved" notification.
2. **Given** a supervisor clicks "Reject" and enters a rejection reason, **When** they confirm, **Then** invoice status → `rejected`, lead status reverts to `in_progress`, agent receives "Invoice rejected" notification.
3. **Given** a supervisor views an already-approved invoice, **When** they open the detail page, **Then** approve/reject buttons are hidden and a "Mark as Sent" button is shown.

---

### User Story 3 — Agent Views Their Invoices (Priority: P2)

An agent navigates to `/invoices` and sees only their own invoice requests with current statuses (pending / approved / rejected / sent).

**Why this priority**: Agents need visibility into their invoice pipeline to follow up with customers.

**Independent Test**: Log in as `user`, go to `/invoices`, verify only own invoices appear with correct status badges.

**Acceptance Scenarios**:

1. **Given** an agent has 3 invoices (1 pending, 1 approved, 1 rejected), **When** they visit `/invoices`, **Then** all 3 are listed with correct status colors and no other agents' invoices are visible.
2. **Given** an agent's invoice was rejected, **When** they click into it, **Then** they see the rejection reason and a "Re-Submit" button to raise a new request on the same lead.

---

### User Story 4 — Supervisor Marks Invoice as Sent (Priority: P2)

After sharing the invoice PDF with the customer, the supervisor marks it as "Sent" inside the system.

**Why this priority**: Closes the loop on the invoice lifecycle; without it there's no record of fulfillment.

**Independent Test**: Log in as `super_admin`, open an `approved` invoice, click "Mark as Sent", verify status → `sent`.

**Acceptance Scenarios**:

1. **Given** an invoice is `approved`, **When** the supervisor clicks "Mark as Sent", **Then** invoice status → `sent`, and the lead remains `invoiced`.
2. **Given** an invoice is already `sent`, **When** the supervisor views it, **Then** only a read-only view is shown — no action buttons.

---

### User Story 5 — Admin/Manager View and Delete Invoices (Priority: P3)

Admins and managers can view all invoices across all agents and delete them if needed.

**Why this priority**: Administrative oversight; lower priority because the core flow works without it.

**Independent Test**: Log in as `admin`, visit `/invoices`, verify all invoices visible, delete one, verify it's removed.

**Acceptance Scenarios**:

1. **Given** an admin visits `/invoices`, **When** the page loads, **Then** all invoices from all agents are listed.
2. **Given** an admin clicks Delete on an invoice, **When** they confirm, **Then** the invoice document is removed and the linked lead status reverts to `in_progress`.

---

### Edge Cases

- What happens when an agent's lead is deleted while an invoice is pending? → Invoice remains but is orphaned; supervisor still sees it.
- What if the supervisor approves an invoice but the agent's session is expired? → Notification queues and is visible on next login.
- What if a user submits duplicate invoice requests (double-click)? → API must be idempotent — reject if a pending invoice already exists for the lead.
- What if consignee info is the same as the lead? → Pre-fill from lead, allow editing.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a `user` role to submit an invoice request from their own `in_progress` lead.
- **FR-002**: Invoice request form MUST collect: consignee (name, address, phone, country, port), unit, chassisNo, engineNo, color, m3Rate, exchangeRate, pushPrice, cnfPrice.
- **FR-003**: System MUST pre-fill consignee fields from the linked lead's customer data (editable).
- **FR-004**: System MUST reject duplicate invoice requests — if a pending invoice already exists for a lead, further submissions MUST return an error.
- **FR-005**: On invoice request submission, lead status MUST change to `invoice_requested`.
- **FR-006**: System MUST create an in-app Notification for all `super_admin` users on new invoice request.
- **FR-007**: `super_admin` MUST be able to approve an invoice; on approval: invoice status → `approved`, lead status → `invoiced`.
- **FR-008**: `super_admin` MUST be able to reject an invoice with an optional note; on rejection: invoice status → `rejected`, lead status → `in_progress`.
- **FR-009**: Invoiced leads (`status: invoiced`) MUST NOT appear in the main `/dashboard` lead list.
- **FR-010**: `user` role MUST see only their own invoices on `/invoices`.
- **FR-011**: `super_admin`, `admin`, `manager` MUST see all invoices on `/invoices`.
- **FR-012**: `super_admin` MUST be able to mark an `approved` invoice as `sent`.
- **FR-013**: `admin` and `manager` MUST be able to delete invoices; on delete, linked lead status MUST revert to `in_progress`.
- **FR-014**: System MUST create an in-app Notification for the agent when their invoice is approved or rejected.
- **FR-015**: Agent MUST be able to re-submit a new invoice request on a `rejected` (status reverted to `in_progress`) lead.
- **FR-016**: Invoice detail page MUST be print-friendly (no sidebar, clean layout).
- **FR-017**: `user` role MUST NOT have approve, reject, or mark-sent actions.
- **FR-018**: `super_admin` MUST NOT be able to raise an invoice request themselves.
- **FR-019**: Notification bell in TopBar MUST show unread count and dropdown of recent notifications.

### Key Entities

- **Invoice**: Links to a Lead; stores consignee details, vehicle details, pricing fields, status lifecycle, createdBy (agent), approvedBy (supervisor), rejectionNote.
- **Notification**: Per-user; stores message text, type (invoice_requested / invoice_approved / invoice_rejected), read flag, linked invoiceId.
- **Lead** (existing — extended): `status` field gets new values `invoice_requested` and `invoiced`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent can submit an invoice request in under 3 minutes from the lead detail page.
- **SC-002**: Supervisor sees new invoice requests immediately (on page load / notification bell) without manual search.
- **SC-003**: All role-based access rules are enforced at API level — no client-side-only guards.
- **SC-004**: Invoice detail page renders correctly in print preview with no sidebar or navigation elements.
- **SC-005**: Lead list on `/dashboard` never shows leads with status `invoiced`.
- **SC-006**: Notification count badge updates on every page without a full refresh (client-side fetch on mount).

---

## Out of Scope

- PDF generation (print browser PDF is sufficient for now)
- Email notifications (in-app only)
- Invoice numbering / sequential invoice IDs (MongoDB ObjectId is sufficient)
- Payment tracking / payment status
- Multi-currency auto-conversion (exchange rate is manually entered)
