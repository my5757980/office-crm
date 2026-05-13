---
name: SBK CRM Full Build Session
description: Complete build of SBK Global Auto Trading CRM — theme, permissions, invoices, forgot-password, agent filter
type: general
stage: general
id: "001"
date: 2026-05-09
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Muhammad Yaseen
command: continue (session continuation)
labels: ["crm", "next.js", "mongodb", "rbac", "invoice-generation", "docx", "exceljs"]
---

## PROMPT_TEXT

Session continuation covering the full SBK CRM build. Key user requests across the session:

1. Fix logo not showing (middleware blocking /logo.png)
2. Change all blue colors to SBK red (#c0272d) — auth pages, sidebar, buttons
3. Change "Enterprise CRM" → "SBK CRM" in white on auth layout left panel
4. Seed only Admin + Manager credentials (no sample data)
5. Generate SBK Word (.docx) and JDM Excel (.xlsx) invoices — Supervisor only
6. Simplify forgot-password: direct email+password reset (no temp password)
7. Lead permissions: Status change = Admin/Manager; Edit details = Supervisor; Delete = Admin/Manager; Create = Agent
8. Make Business Name and Email optional in lead form
9. Add agent filter on All Leads page with per-agent lead count cards

## RESPONSE_TEXT

All features implemented and verified:

### Files Modified/Created

- `src/proxy.ts` — matcher excludes image/font files so /logo.png loads
- `src/app/(auth)/layout.tsx` — full red/black theme, "SBK CRM" label white
- `src/components/auth/LoginForm.tsx` — red focus/button styles
- `src/app/(auth)/forgot-password/page.tsx` — direct credential reset form
- `src/app/api/auth/forgot-password/route.ts` — accepts {email, newEmail, newPassword}
- `scripts/seed.ts` — only admin@sbk.com + manager@sbk.com
- `src/app/api/invoices/[id]/download/sbk/route.ts` — Word doc via docx package
- `src/app/api/invoices/[id]/download/jdm/route.ts` — Excel via exceljs
- `src/components/invoices/InvoiceDetail.tsx` — download buttons for super_admin
- `src/app/api/leads/[id]/route.ts` — split PATCH: status=admin/manager, details=super_admin
- `src/app/(crm)/leads/[id]/page.tsx` — correct canEdit/canChangeStatus/canDelete props
- `src/components/leads/LeadDetail.tsx` — status dropdown for admin/manager
- `src/lib/validations.ts` — customerName + email optional
- `src/components/leads/LeadForm.tsx` — removed required from Business Name
- `src/app/(crm)/admin/leads/page.tsx` — agent cards with lead counts + agentId filter

### Credentials
- Admin: admin@sbk.com / Admin@SBK1
- Manager: manager@sbk.com / Manager@SBK1

### Permission Matrix
| Action | admin | manager | super_admin (Supervisor) | user (Agent) |
|--------|-------|---------|--------------------------|--------------|
| Create lead | ❌ | ❌ | ❌ | ✅ |
| View lead | ✅ | ✅ | ✅ | own only |
| Edit lead details | ❌ | ❌ | ✅ | ❌ |
| Change lead status | ✅ | ✅ | ❌ | ❌ |
| Delete lead | ✅ | ✅ | ❌ | ❌ |
| Request invoice | ❌ | ❌ | ❌ | ✅ (in_progress) |
| Approve/reject invoice | ❌ | ❌ | ✅ | ❌ |
| Download SBK/JDM invoice | ❌ | ❌ | ✅ | ❌ |
| Create users | ✅ | ✅ | creates agents | ❌ |
| Reset password | ✅ | ✅ | ❌ | ❌ |
