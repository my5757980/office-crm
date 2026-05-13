# Data Model: Office CRM Lead Generation

**Feature**: 001-crm-lead-generation
**Date**: 2026-05-02

---

## Entity: User

```typescript
interface IUser {
  _id: ObjectId
  name: string              // required, full name
  email: string             // required, unique, lowercase
  password: string          // required, bcrypt hashed
  role: 'user' | 'admin' | 'manager' | 'super_admin'
  isActive: boolean         // default: true; false = deactivated
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**: `email` (unique)
**Validation**: email format, password min 8 chars, role enum

---

## Entity: Lead

```typescript
interface ILead {
  _id: ObjectId
  customerName: string      // required
  contactPerson: string     // required
  address?: string          // optional
  phone: string             // required
  email?: string            // optional, email format
  country: string           // required, country name (e.g. "PAKISTAN")
  countryCode: string       // required, 2-letter ISO (e.g. "PK")
  port: string              // required, port name
  status: 'new' | 'in_progress' | 'closed'  // default: 'new'
  createdBy: ObjectId       // ref: User — who created this lead
  createdAt: Date
  updatedAt: Date
}
```

**Indexes**: `createdBy`, `country`, `createdAt`
**RBAC filter**: `role=user` → query adds `{ createdBy: session.user.id }`

---

## Entity: Message (Chat)

```typescript
interface IMessage {
  _id: ObjectId
  leadId: ObjectId          // ref: Lead
  userId: ObjectId          // ref: User (who wrote)
  userName: string          // denormalized for display speed
  message: string           // required, max 1000 chars
  createdAt: Date
}
```

**Indexes**: `leadId`, `createdAt`
**Rules**: Append-only. No update/delete endpoints.

---

## Relationships

```
User (1) ──── (many) Lead    [createdBy]
Lead (1) ──── (many) Message [leadId]
User (1) ──── (many) Message [userId]
```

---

## State Machine: Lead Status

```
new ──→ in_progress ──→ closed
 └──────────────────────→ closed
```

---

## RBAC Matrix

| Action | user | admin | manager | super_admin |
|--------|------|-------|---------|-------------|
| Create lead | own | own | own | own |
| Read leads | own only | all | all | all |
| Edit lead | own | all | all | all |
| Delete lead | no | no | no | yes |
| Read messages | own lead | all | all | all |
| Post message | own lead | all | all | all |
| Manage users | no | no | no | yes |
