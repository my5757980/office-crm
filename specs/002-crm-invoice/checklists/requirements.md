# Requirements Checklist — 002-crm-invoice

## Functional Requirements

- [ ] FR-001: User role can submit invoice request from own in_progress lead
- [ ] FR-002: Invoice form collects all required fields (consignee + vehicle + pricing)
- [ ] FR-003: Consignee fields pre-filled from lead (editable)
- [ ] FR-004: Duplicate invoice request rejected if pending invoice exists for lead
- [ ] FR-005: Lead status → invoice_requested on submission
- [ ] FR-006: In-app notification sent to all super_admin on new invoice request
- [ ] FR-007: super_admin can approve → invoice:approved, lead:invoiced
- [ ] FR-008: super_admin can reject with note → invoice:rejected, lead:in_progress
- [ ] FR-009: Invoiced leads hidden from /dashboard lead list
- [ ] FR-010: user sees only own invoices on /invoices
- [ ] FR-011: super_admin/admin/manager see all invoices on /invoices
- [ ] FR-012: super_admin can mark approved invoice as sent
- [ ] FR-013: admin/manager can delete invoice → lead reverts to in_progress
- [ ] FR-014: Agent notified when invoice approved or rejected
- [ ] FR-015: Agent can re-submit after rejection (lead back to in_progress)
- [ ] FR-016: Invoice detail page is print-friendly
- [ ] FR-017: user role has no approve/reject/mark-sent actions
- [ ] FR-018: super_admin cannot raise invoice request
- [ ] FR-019: Notification bell shows unread count + dropdown

## Data Models

- [ ] Invoice model created (Mongoose schema)
- [ ] Notification model created (Mongoose schema)
- [ ] Lead model extended with invoice_requested + invoiced statuses

## API Endpoints

- [ ] POST /api/invoices — create invoice request
- [ ] GET /api/invoices — list (filtered by role)
- [ ] GET /api/invoices/[id] — detail
- [ ] PATCH /api/invoices/[id] — approve / reject / mark-sent
- [ ] DELETE /api/invoices/[id] — admin/manager delete
- [ ] GET /api/notifications — list for current user
- [ ] PATCH /api/notifications/[id]/read — mark read
- [ ] PATCH /api/notifications/read-all — mark all read

## Pages

- [ ] /invoices — invoice list page
- [ ] /invoices/[id] — invoice detail page (print-friendly)
- [ ] /leads/[id] — Request Invoice button added (user only, in_progress only)

## UI Components

- [ ] InvoiceRequestForm component
- [ ] InvoiceTable component
- [ ] InvoiceDetail component
- [ ] InvoiceStatusBadge component
- [ ] NotificationBell component (TopBar)
- [ ] NotificationDropdown component

## Non-Functional

- [ ] Print CSS applied to invoice detail (no sidebar, clean)
- [ ] All RBAC enforced at API level (not just UI)
- [ ] No invoiced leads appear in dashboard query
