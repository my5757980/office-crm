# Feature: Optional pricing on the invoice request

**Created**: 2026-10-02 | **Status**: Implemented
**Input**: Sir, 2 Oct 2026. On the agent's "Submit Invoice Request" form (Consignee, Vehicle, Pricing), make every Pricing field optional so a request can be submitted without them.

## Requirements

- **FR-001**: M3 Rate, Exchange Rate, Push Price, CNF Price and Advance % may be left empty. The form no longer marks them required.
- **FR-002**: A value that IS typed is still checked as before. A price must be positive, and Advance % must be between 1 and 100.
- **FR-003**: Consignee and Vehicle fields are unchanged and still required as before.
- **FR-004**: The pricing columns are `NOT NULL`, so no database change is made. A blank price is saved as 0, and a blank Advance % is saved as 50, the existing default.
- **FR-005**: The Supervisor fills the pricing in later with the existing **Edit** on the invoice.
- **FR-006**: No WooCommerce order is created at $0.
  - A request without a CNF price gets its order when the Supervisor first sets a CNF price through Edit.
  - A request with a CNF price gets its order at once, as before.

## Changes

- `src/lib/validations.ts`: `optionalPrice()` treats blank (NaN, "" or null) as not given. The outer `.optional()` is needed because zod 4 refuses a missing key on a bare preprocess, and the form's JSON drops undefined keys. Advance % defaults to 50.
- `src/components/invoices/InvoiceRequestForm.tsx`: no `required` mark on the five pricing fields.
- `src/app/api/invoices/route.ts`: saves `?? 0` and `?? 50`, and syncs to WooCommerce only with a CNF price.
- `src/app/api/invoices/[id]/route.ts`: when "edit" sets a CNF price above 0 on an invoice with no WooCommerce order, it creates the order.

## Tests

- **Behaviour, with the real zod 4.4.1 against the real `validations.ts`: 10/10.**
  - Accepted: keys missing, all boxes empty (NaN), blanks or null, partial pricing, full pricing unchanged.
  - Still refused: negative price, typed 0, Advance % over 100, empty unit, empty consignee name.
- **Types:** `tsc --strict` over the schema and its use in the API and the form passes.
- **Syntax:** esbuild over the 4 files passes.

## Update, 2 Oct 2026 (later the same day): only four fields required

**Input**: Sir. On the whole invoice request form, keep only name, e-mail, phone number and country required. Every other field is optional.

- **FR-007**: The required fields are consignee **Name**, **E-mail** (newly required, and it must be a valid address), **Phone** and **Country**.
- **FR-008**: Port, Address, Unit, Year, Color, Chassis, Engine, Transmission, Fuel, Sales Person and all Pricing are optional. Blank text is saved as `""`; those columns are `NOT NULL` text, which accepts it, so there is no database change.
- **Tests**: the real zod 4.4.1 passes 13/13.
  - Accepted: only the four fields; every other box empty; a full form, with values unchanged.
  - Refused: empty, missing or invalid e-mail; blank name, phone or country.
  - E-mail is trimmed. A negative price and Advance % over 100 are still refused.
  - `tsc --strict` passes.
