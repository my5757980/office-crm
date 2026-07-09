export const DOCUMENT_FOLDERS = [
  "Auction Details/Pics",
  "Export Certificate",
  "Yard Pictures",
  "Inspection Certificate",
  "BL / Surrender",
  "DHL",
] as const;

export type DocumentFolder = (typeof DOCUMENT_FOLDERS)[number];
