// The Excel lead upload's columns, in template order. Every one of these
// headings must be in row 1 of an uploaded file (/api/leads/import); the
// template (/api/leads/template) is built from the same list.
export const LEAD_TEMPLATE_HEADERS = [
  "Contact Person",
  "Customer Name",
  "Phone",
  "Email",
  "Country",
  "Port",
  "Address",
] as const;
