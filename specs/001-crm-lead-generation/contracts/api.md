# API Contracts: Office CRM Lead Generation

**Feature**: 001-crm-lead-generation
**Date**: 2026-05-02
**Auth**: All endpoints require valid NextAuth session (except /api/auth/*)

---

## Auth

### POST /api/auth/[...nextauth]
NextAuth handler — login, logout, session

---

## Leads

### GET /api/leads
Returns leads based on caller's role.

**Query params**: `search`, `country`, `port`, `status`, `from`, `to`, `page`, `limit`

**Response**:
```json
{
  "leads": [{ "_id": "", "customerName": "", "country": "", "port": "", "status": "", "createdBy": { "name": "" }, "createdAt": "" }],
  "total": 0,
  "page": 1
}
```
**RBAC**: `user` → only own leads | `admin/manager/super_admin` → all leads

---

### POST /api/leads
Create a new lead.

**Body**:
```json
{
  "customerName": "string (required)",
  "contactPerson": "string (required)",
  "address": "string (optional)",
  "phone": "string (required)",
  "email": "string (optional)",
  "country": "string (required)",
  "countryCode": "string (required)",
  "port": "string (required)"
}
```
**Response**: `201 { lead: ILead }`
**RBAC**: All authenticated users

---

### GET /api/leads/[id]
Get single lead detail.

**Response**: `{ lead: ILead, messages: IMessage[] }`
**RBAC**: Owner or admin/manager/super_admin

---

### PATCH /api/leads/[id]
Update lead fields or status.

**Body**: Partial ILead fields
**Response**: `{ lead: ILead }`
**RBAC**: Owner or admin/manager/super_admin

---

## Messages (Chat)

### POST /api/leads/[id]/messages
Post a chat message to a lead.

**Body**: `{ "message": "string (required, max 1000)" }`
**Response**: `201 { message: IMessage }`
**RBAC**: Users with read access to the lead

---

## Users (Super Admin only)

### GET /api/admin/users
List all users.

**Response**: `{ users: IUser[] }` (password excluded)
**RBAC**: super_admin only → 403 for others

---

### POST /api/admin/users
Create a new user account.

**Body**:
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 8)",
  "role": "user | admin | manager | super_admin"
}
```
**Response**: `201 { user: IUser }`
**RBAC**: super_admin only

---

### PATCH /api/admin/users/[id]
Update user role or isActive status.

**Body**: `{ "role"?: string, "isActive"?: boolean }`
**Response**: `{ user: IUser }`
**RBAC**: super_admin only

---

## Error Format

```json
{ "error": "Human-readable message" }
```

**Status codes**: 400 validation | 401 unauthenticated | 403 forbidden | 404 not found | 500 server error
