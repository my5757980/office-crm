# Spec: Office CRM — Lead Generation Module

**Feature ID:** 001-crm-lead-generation
**Date:** 2026-05-02
**Status:** Draft
**Branch:** 001-crm-lead-generation

---

## Overview

An internal office CRM portal for a shipping/auto-trading company. Staff members log in, add leads (potential customer records), and manage them. The portal enforces role-based access so each staff member sees only their own leads, while managers and admins have visibility across all leads. Each lead includes a WhatsApp-style internal chat for notes and follow-up communication.

---

## Goals

- Allow 15+ office staff to record and track customer leads independently
- Enforce strict data isolation: users see only their own leads
- Provide managers and admins full visibility across all leads
- Auto-populate port options based on country selection (218 countries)
- Enable per-lead internal messaging between staff (notes/chat)

---

## Target Users

| Role | Who | What they can do |
|------|-----|-----------------|
| User | Sales staff (15 people) | Add leads, view own leads only, chat on own leads |
| Admin | Office admin | View ALL leads, no user management |
| Manager | Team manager | View ALL leads, no user management |
| Super Admin | System owner | View ALL leads, manage all users, full access |

---

## User Scenarios

### Scenario 1 — Staff adds a lead
1. Staff logs in with own credentials
2. Clicks "New Lead"
3. Fills form: Customer Name, Contact Person, Phone, Country
4. Selects country — port auto-populates (single port auto-selected, multi-port shows dropdown)
5. Submits — lead saved, appears in their dashboard

### Scenario 2 — Staff views own leads only
1. Staff logs in
2. Dashboard shows ONLY leads they created
3. Cannot access any URL or API endpoint that returns another user's leads

### Scenario 3 — Manager sees all leads
1. Manager logs in
2. Dashboard shows ALL leads from ALL staff
3. Can filter by staff member, country, port, date range

### Scenario 4 — Chat on a lead
1. Staff opens lead detail page
2. Sees chat section at bottom (WhatsApp-style)
3. Types a message/note and submits
4. Message appears with their name and timestamp
5. Any staff with access to that lead can read the chat

### Scenario 5 — Super Admin manages users
1. Super Admin logs in
2. Goes to User Management
3. Creates new user account with name, email, password, role
4. Can edit role or deactivate existing accounts

### Scenario 6 — Country to Port auto-selection
1. User selects a country from dropdown
2. System checks port count for that country
3. If 1 port — auto-fills port field (read-only display)
4. If 2+ ports — shows port dropdown for user selection

---

## Functional Requirements

### Authentication
- FR-01: Users log in with email and password
- FR-02: Sessions maintained securely; inactive sessions expire after 8 hours
- FR-03: Unauthenticated users redirected to /login
- FR-04: Passwords stored hashed (never plaintext)

### Lead Management
- FR-05: Authenticated users can create a lead with: Customer Name/Business Name (required), Contact Person (required), Address (optional), Phone Number (required), Email Address (optional), Country (required), Port (required)
- FR-06: Country dropdown contains all 218 countries from official port database
- FR-07: Selecting a country with exactly 1 port auto-fills the port field
- FR-08: Selecting a country with 2+ ports shows port dropdown with all valid options
- FR-09: Users can view and edit their own leads
- FR-10: Lead list supports search by customer name
- FR-11: Lead list supports filter by country, port, and date range
- FR-12: Each lead has a status field: New, In Progress, Closed

### Role-Based Access Control
- FR-13: Users (role=user) can only read/write their own leads via UI and API
- FR-14: Admin and Manager roles can read all leads from all users
- FR-15: Super Admin can read all leads AND manage user accounts
- FR-16: All API endpoints enforce role checks server-side

### Chat / Internal Notes
- FR-17: Each lead has a chat section showing messages chronologically
- FR-18: Any staff with access to a lead can post a message
- FR-19: Each message shows author name and timestamp
- FR-20: Chat is append-only (no editing or deleting messages)
- FR-21: Chat updates on page refresh (no real-time requirement)

### User Management (Super Admin only)
- FR-22: Super Admin can create accounts with name, email, password, role
- FR-23: Super Admin can change a user's role
- FR-24: Super Admin can deactivate a user (prevents login, preserves data)

---

## Data Entities

### User
| Field | Type | Notes |
|-------|------|-------|
| name | string | Full name |
| email | string | Unique, login credential |
| password | string | Hashed with bcrypt |
| role | enum | user / admin / manager / super_admin |
| isActive | boolean | false = deactivated |
| createdAt | date | Auto-set |

### Lead
| Field | Type | Notes |
|-------|------|-------|
| customerName | string | Required |
| contactPerson | string | Required |
| address | string | Optional |
| phone | string | Required |
| email | string | Optional |
| country | string | Country name |
| countryCode | string | 2-letter ISO code |
| port | string | Port name |
| status | enum | new / in_progress / closed |
| createdBy | userId | Reference to User who created |
| createdAt | date | Auto-set |
| updatedAt | date | Auto-updated |

### Message
| Field | Type | Notes |
|-------|------|-------|
| leadId | reference | Which lead this belongs to |
| userId | reference | Who wrote it |
| userName | string | Denormalized for display |
| message | string | Message text |
| createdAt | date | Auto-set |

---

## Pages

| Path | Access | Description |
|------|--------|-------------|
| /login | Unauthenticated | Login form |
| /dashboard | All authenticated | Lead list (role-filtered) |
| /leads/new | All authenticated | New lead form |
| /leads/[id] | Owner or elevated roles | Lead detail + chat |
| /leads/[id]/edit | Owner or elevated roles | Edit lead |
| /admin/users | Super Admin only | User management |

---

## Success Criteria

- SC-01: Staff can create a complete lead in under 2 minutes
- SC-02: Country selection auto-populates port with zero extra clicks for single-port countries
- SC-03: A user cannot access another user's lead data through any route
- SC-04: Managers and admins see all leads across all staff
- SC-05: All 218 countries are available in the country dropdown
- SC-06: Chat messages appear chronologically with author name and time
- SC-07: Super Admin can create a new staff account in under 1 minute

---

## Assumptions

- A1: Port data is static — sourced from provided PDF (218 countries, pre-parsed to JSON)
- A2: Chat is not real-time — page refresh is sufficient
- A3: No email notifications in this phase
- A4: No file attachments in chat in this phase
- A5: Password reset out of scope — Super Admin resets manually
- A6: No public self-registration — Super Admin creates all accounts
- A7: Mobile responsive required; dedicated mobile app out of scope

---

## Out of Scope (Case 1)

- Invoice generation (Case 2 — next phase)
- Real-time chat / WebSockets
- Email or SMS notifications
- File attachments
- Public user registration
- Reporting and analytics dashboard
- External CRM integrations
