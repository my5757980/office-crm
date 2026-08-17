# Office CRM — Used-Car Export Back Office

A working back-office system for a **Japan-based used-vehicle export business**. It carries a
deal through its whole life: an enquiry arrives, becomes a proforma invoice, the customer pays in
instalments against it, a physical vehicle is attached, export documents are collected folder by
folder, and the month closes into a report.

Built with Next.js 16 (App Router), TypeScript and PostgreSQL.

> This is an internal operations tool, not a generic CRM template. The data model is shaped
> around vehicle export — chassis and engine numbers, M3 freight rate, CNF price, destination
> port, BL/surrender documents.

---

## The workflow it models

```
Lead ──────────► Invoice ──────────► Payment ──────────► Unit ──────────► Documents
contact person   consignee +         amount received     make / model     6 fixed folders
phone, country   chassis, engine     receipt image       chassis, CC      per vehicle
port             M3 + FX rate        yen amount          drive, steering
                 CNF, advance %      FX rate             mileage, seats
                                                                              │
                                                                              ▼
                                                                          Reports
                                                                    monthly close,
                                                                    XLSX / DOCX export
```

Each arrow is a real foreign key: a payment cannot exist without an `invoiceId`, a unit cannot
exist without one either. The chain is the product — you can always answer "which vehicle did
this money buy, and for which lead".

### Domain fields that are not optional

These are enforced in `src/lib/validations.ts` with Zod, on both the form and the route handler:

| Stage | Required |
|---|---|
| **Lead** | contact person · phone · country · country code · **port** |
| **Invoice** | consignee (name, phone, country, port) · **chassis no** · **engine no** · colour · M3 rate · exchange rate · push price · CNF price · advance % (1–100, default 50) |
| **Payment** | invoice id · selling price · amount received · received date — optional FX rate, yen amount, receipt image |
| **Unit** | invoice id · make · model · year · chassis · engine CC · drive · fuel · mileage · transmission · steering · doors · seats · location |

Money fields are validated `positive()` rather than merely numeric, so a zero or negative price
is rejected at the boundary instead of quietly landing in a report.

### Document folders

Six fixed folders per vehicle (`src/lib/constants.ts`), matching how the paperwork actually
arrives — not free-form uploads:

`Auction Details/Pics` · `Export Certificate` · `Yard Pictures` · `Inspection Certificate` ·
`BL / Surrender` · `DHL`

---

## Routes

| Area | Path | |
|---|---|---|
| Dashboard | `/dashboard` | overview |
| Leads | `/leads` | enquiry intake and follow-up |
| Invoices | `/invoices` | proforma generation, PDF |
| Units | `/units` | vehicle records |
| Reports | `/reports` | monthly close, exports |
| Profile | `/profile` | own account |
| Admin | `/admin` | user and role management |

API route handlers under `src/app/api/`: `auth` · `leads` · `invoices` · `payments` · `units` ·
`reports` · `notifications` · `chat` · `backup` · `admin`.

## Roles

Four roles, defined in the user schema: `user` · `manager` · `admin` · `super_admin`.
Auth is NextAuth v5 with credentials and bcrypt-hashed passwords.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16.2.4 (App Router) + React 19 | server components; route handlers are the API |
| Language | TypeScript 5 | |
| Database | PostgreSQL — Neon serverless in production, `pg` locally | `src/lib/pg.ts` and `src/lib/localPg.ts` are separate on purpose |
| Auth | NextAuth v5 + bcryptjs | |
| Validation | Zod + React Hook Form | one schema drives the form and the handler |
| Documents | `@react-pdf/renderer` (invoices) · `docx` · `exceljs` (reports) | |
| Realtime | `ws` | notifications and chat |
| Styling | Tailwind CSS v4 | |

The project began on MongoDB and was migrated to PostgreSQL —
`scripts/migrate-mongo-to-postgres.js` is the migration that was actually run, kept in the repo
rather than deleted.

---

## Running it

Requires Node.js 20+ and a PostgreSQL database (local, or a free Neon project).

```bash
npm install
cp .env.example .env.local      # DATABASE_URL, AUTH_SECRET
npm run dev                     # http://localhost:3000
```

```bash
npm run build && npm start      # production
```

---

## How this was built

Spec-driven, via SpecKit Plus: constitution → spec → plan → tasks → implementation. The
artefacts are in the repo and are the honest record of how it was built:

- [`.specify/memory/constitution.md`](.specify/memory/constitution.md) — project principles
- [`specs/`](specs/) — spec, plan and task breakdown per feature
- [`history/`](history/) — prompt history records
- [`build-logs/`](build-logs/) — build output

## Known gaps

Stated plainly rather than left to be discovered:

- **No automated test suite.** `scripts/gen-test-docs.mjs` generates test documents; there is no
  unit or integration test run in CI.
- **`src/src/`** is a leftover `create-next-app` scaffold nested one level too deep. It is dead
  code — nothing imports it — and is scheduled for deletion.
- Backup (`/api/backup`) is manual, not scheduled.
