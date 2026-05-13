---
id: 001
title: CRM Lead Generation Spec
stage: spec
date: 2026-05-02
surface: agent
model: claude-sonnet-4-6
feature: 001-crm-lead-generation
branch: 001-crm-lead-generation
user: Muhammad Yaseen
command: /sp.specify
labels: ["spec","crm","lead-generation","rbac","chat","ports","countries"]
links:
  spec: E:/New folder/specs/001-crm-lead-generation/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - E:/New folder/specs/001-crm-lead-generation/spec.md
  - E:/New folder/specs/001-crm-lead-generation/checklists/requirements.md
  - E:/New folder/millinior/countries_ports.json
tests:
  - checklist: requirements.md — all items PASS
---

## Prompt

Office CRM Portal — Case 1: Lead Generation. Fields: Customer Name, Contact Person, Address, Phone, Email, Port, Country (218 countries from PDF), WhatsApp-style chat. Country→Port logic: 1 port=auto-select, 2+ ports=dropdown. Roles: User (own leads only), Admin, Manager (all leads), Super Admin (all + user management). 15 staff, each sees only their own leads.

## Response Snapshot

Spec written to E:/New folder/specs/001-crm-lead-generation/spec.md. 218 countries parsed from PDF into countries_ports.json. 24 functional requirements across 5 areas: Auth, Lead Management, RBAC, Chat, User Management. 3 data models: User, Lead, Message. 6 pages defined. All checklist items pass. Ready for /sp.plan.

## Outcome

- Spec: COMPLETE — 24 FRs, 7 success criteria, 3 data models
- Port data: 218 countries extracted from PDF to countries_ports.json
- Checklist: All items PASS
- Next: /sp.plan
