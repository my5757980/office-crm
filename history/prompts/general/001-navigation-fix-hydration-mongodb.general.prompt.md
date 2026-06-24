---
name: navigation-fix-hydration-mongodb
description: Fix sidebar navigation freeze, MongoDB sort crash, and slow invoices load
metadata:
  type: general
  id: "001"
  stage: general
  date: "2026-06-24"
  surface: agent
  model: claude-sonnet-4-6
  feature: none
  branch: main
  user: Muhammad Yaseen
  command: continue
  labels: ["bugfix", "performance", "mongodb", "hydration", "navigation"]
  links:
    spec: "null"
    ticket: "null"
    adr: "null"
    pr: "null"
---

## PROMPT_TEXT

Continue (resumed from previous context). Issues reported:
1. Units page "Something went wrong" error
2. Sidebar navigation not working — clicking Invoices/any section stays on Dashboard
3. Invoices page 20s slow load
4. DAR ES SALAAM spelling fix
5. SBK invoice: Japan phone number, advance % label fix

## RESPONSE_TEXT

### Root Causes Diagnosed and Fixed

**1. MongoDB sort memory crash (units page)**
- `UnitFile.find().sort({ uploadedAt: 1 })` exceeded 32MB in-memory sort limit due to image buffer data
- Fix: removed DB `.sort()`, added `.select("unitId _id uploadedAt")`, sorted in JS
- Added `.allowDiskUse(true)` to ALL sorted queries across entire app (20+ files)

**2. React hydration error #418 (sidebar navigation broken)**
- `toLocaleDateString()` without `timeZone: "UTC"` rendered different dates on server (UTC) vs client (Japan/Pakistan timezone)
- Hydration mismatch → React error #418 → Next.js client router died → all Link clicks ignored
- Fix: added `timeZone: "UTC"` to every `toLocaleDateString`/`toLocaleTimeString`/`toLocaleString` call in all client components (LeadTable, InvoiceTable, CustomerTable, InvoiceDetail, UnitDetail, UnitsTable, PaymentSection, UserTable, LeadDetail, LeadChat, ChatWidget, reports/page)

**3. Invoices 20s slow load**
- `createdAt` index declared in schema but never built on MongoDB Atlas → full collection scan on every page load
- Fix: created `/api/admin/ensure-indexes` route (super_admin only), called it, confirmed all 5 indexes built: invoices.createdAt, units.createdAt, unitfiles.unitId_uploadedAt, leads.createdAt, payments.invoiceId_receivedDate

**4. Other fixes**
- Zimbabwe ports: `DAR ES SALAM` → `DAR ES SALAAM`
- SBK invoice: Japan phone `+81 3 5050 0251` → `+81 70 9427 5106`
- SBK advance % label: hardcoded `"50% AMOUNT"` → dynamic `` `${advPct}% AMOUNT` ``

## FILES_YAML
 - src/app/(crm)/units/page.tsx
 - src/app/(crm)/invoices/page.tsx
 - src/app/api/invoices/route.ts
 - src/app/api/leads/route.ts
 - src/app/(crm)/dashboard/page.tsx
 - src/app/(crm)/admin/leads/page.tsx
 - src/app/api/reports/route.ts
 - src/app/api/reports/detail/route.ts
 - src/app/api/payments/route.ts
 - src/app/(crm)/units/[id]/page.tsx
 - src/app/api/leads/[id]/route.ts
 - src/app/(crm)/leads/[id]/page.tsx
 - src/app/api/notifications/route.ts
 - src/app/api/admin/users/route.ts
 - src/app/api/chat/messages/route.ts
 - src/app/api/admin/ensure-indexes/route.ts
 - src/components/leads/LeadTable.tsx
 - src/components/leads/CustomerTable.tsx
 - src/components/invoices/InvoiceTable.tsx
 - src/components/invoices/InvoiceDetail.tsx
 - src/components/units/UnitDetail.tsx
 - src/components/units/UnitsTable.tsx
 - src/components/invoices/PaymentSection.tsx
 - src/components/admin/UserTable.tsx
 - src/components/leads/LeadDetail.tsx
 - src/components/chat/ChatWidget.tsx
 - src/components/leads/LeadChat.tsx
 - src/data/countries_ports.json
 - src/app/api/invoices/[id]/download/sbk/route.ts
 - src/app/(crm)/reports/page.tsx

## TESTS_YAML
 - Verified MongoDB indexes built via /api/admin/ensure-indexes (all 5 returned "ok")
 - Playwright: confirmed Units page loads after JS-sort fix
 - Playwright: confirmed zero React errors on dashboard after hydration fix
