# Feature: Several vehicles on one invoice

**Created**: 2026-10-05 | **Status**: Implemented
**Input**: Sir, 5 Oct 2026. On the invoice request, where the unit (vehicle details) is entered, add an "Add More" button so one invoice can carry several vehicles. Every vehicle then appears on the invoice. When the invoice is approved, all of them are uploaded.
**Agreed with the owner before building:**
1. Each vehicle has its own details AND its own Push and CNF price. M3 rate, exchange rate, advance % and sales person stay once per invoice. The invoice total is the sum of the vehicles.
2. After approval, one unit (photos/documents) can be added per vehicle.

## Requirements

- **FR-001**: The request form has one card per vehicle and an **Add More** button. Every card except the only one has **Remove**.
  - Each card holds: Unit / Make & Model, Year, Color, Chassis, Engine, Transmission, Fuel, Push Price and CNF Price.
  - Every box stays optional, as before (Sir's 2 Oct rule).
  - A typed price must be positive.
  - A completely empty extra card is dropped.
  - At most 50 vehicles per invoice.
- **FR-002**: The form shows the live Total Push / Total CNF under Pricing.
- **FR-003**: Storage is a new table `invoice_vehicles` (one row per vehicle, in order).
  - It is created on first use, like `sso_nonces`, and no existing table is changed.
  - The `invoices` row keeps vehicle 1 in its own columns and the **total** push / CNF prices. Everything that reads only the invoice row therefore keeps working: lists, reports, payments, balance, WooCommerce, the website feed.
  - The invoice and all its vehicles are written by one SQL statement, so either all of it is saved or none of it is.
- **FR-004**: Invoices made before this change have no vehicle rows and are read as one vehicle from their own row. Nothing about them changes.
- **FR-005**: Invoice page.
  - With several vehicles it shows a Vehicles table (with each vehicle's push and CNF price), and the pricing card says "total of N vehicles".
  - One vehicle looks exactly as before.
- **FR-006**: Edit Invoice (Supervisor) edits the vehicle list: change, Add More, Remove. Totals and vehicle 1's columns follow.
  - An older screen that still sends single vehicle boxes edits vehicle 1 and keeps the rest.
- **FR-007**: The SBK, SBK-US and JDM Excel invoices print one row per vehicle with its own C&F price. TOTAL, advance, balance and amount-in-words come from the invoice total.
  - **SBK** has 3 item rows. Beyond 3 vehicles the sheet grows and shrinks in proportion: the original measures 937.5pt in Excel.
  - **SBK-US** grows one row per extra vehicle. The stamp and signature move with the sheet, and it shrinks to stay on one A4 page: the original measures 856.5pt at 95%.
  - **JDM** has 8 item rows. Beyond 8 it grows and shrinks only if needed.
  - A one-vehicle invoice is identical to the original output.
  - The amount in words now handles millions.
- **FR-008**: Units. "Add Unit" stays until every vehicle has its unit ("Add Unit (k of N)"). The form is pre-filled from that vehicle (make, model, year, colour, chassis). Units are listed on the invoice.
  - A one-vehicle invoice behaves as before, including the 409 "Unit already exists for this invoice".
- **FR-009**: The invoice list shows "+N more" next to the vehicle. The supervisor notification says "(N vehicles)".
- **FR-010**: Other consumers.
  - **WooCommerce:** a multi-vehicle order has one fee line per vehicle.
  - **Website feed** (`/api/external/customer`): each invoice gets a `vehicles` list (no push prices). The old fields remain vehicle 1.
  - **Manager backup:** gets an "Invoice Vehicles" sheet.

## Tests (all against real Postgres via PGlite, running the real route code)

- `run-db.ts` **32/32**.
  - Create: 2 vehicles + a blank card. Old single-field request. Empty request. Validation (negative price, 51 vehicles, name required).
  - GET returns vehicles.
  - Edit: replace, add, totals. Old-style edit. Empty list refused. Legacy invoice edits.
  - Counts. Units one per vehicle (409 text unchanged for one vehicle).
  - Feed helper. Delete cascades.
- `run-xlsx.ts` **39/39**.
  - Legacy and new one-vehicle invoices are **byte-identical** to the original routes (every xlsx part except the creation time) for SBK, SBK-US and JDM.
  - 2, 4 and 10 vehicles: rows, totals, words and print area are right.
  - Excel 2007 renders to PDF: SBK-US and JDM are 1 page for 2/4/10 vehicles. SBK is 2 pages, exactly like the original one-vehicle SBK in this Excel.
- `e2e.py` **24/24**: the real app (`next start`) against a local Neon-compatible endpoint.
  - The agent adds 3 vehicles (Add More / Remove), and the list shows +2 more.
  - The Supervisor sees the vehicles table, edits (price + 4th vehicle), approves, and downloads all 3 Excel files.
  - The Manager adds 4 units, each pre-filled, and then Add Unit disappears.
  - No browser errors. The phone layout has no overflow.
- `tsc --noEmit` is clean, and `next build --webpack` passes.
