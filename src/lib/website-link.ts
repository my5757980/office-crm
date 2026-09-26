// Trust between the SBK website (Laravel, sbk-main) and this CRM.
//
// The website signs short-lived tokens with its RSA private key. The CRM keeps
// only the matching PUBLIC key, so neither CRM host (cPanel, Vercel) has to
// store a shared secret. A token is `v1.<payload>.<signature>` in base64url;
// the signature is RSA-SHA256 (PKCS#1 v1.5) over the text `v1.<payload>`.
//
//   purpose "sso" - the "CRM Global" button: sub = the website user's email,
//                   lives at most 60 s and can be used once (see consumeNonce).
//   purpose "api" - a read of /api/external/*: bound to the request's method,
//                   path and query, lives at most 120 s.
import crypto from "crypto";
import { query } from "./pg";

const DEFAULT_WEBSITE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzX7G2AuIgf/RJCphNiFI
fvjT/2g0YcAEdE6tznFOLKWX6Zm2k902XLXxzhpaZ9bfP6jijWfqFQMHOFYzSuXr
j9tijHefcCkqNN55tRVJMj7WZkCeZ802OE3SYNV2KRdrAvTvWdlNwpkqGpi9Ptp6
FfFqDPtSUuK+fFyXk8/dEA54E+LGN5zG9PdnpuMY+vyOHOTb8wKVA/yUfXrYuo7I
DKgn5lx4gXk3Q+2eUMmj02NBUPqTfy985pjC9FezKWDLiLHXIwz94oJ3Z0l93RXY
YVRsWcOcTzjK1ftqHv5hbN0373c4nt+SxI7yIO11ncPu5QuISM2W0xFA75Wo6qXF
YwIDAQAB
-----END PUBLIC KEY-----`;

const ISSUER = "sbk-website";
const AUDIENCE = "sbk-crm";
const MAX_LIFETIME = { sso: 60, api: 120 } as const;
const CLOCK_SKEW = 30;

export type WebsiteTokenPurpose = keyof typeof MAX_LIFETIME;

export interface WebsiteClaims {
  iss: string;
  aud: string;
  purpose: WebsiteTokenPurpose;
  iat: number;
  exp: number;
  nonce: string;
  sub?: string;
  m?: string;
  p?: string;
  q?: string;
}

let cachedKey: crypto.KeyObject | null = null;

// WEBSITE_PUBLIC_KEY may hold the PEM itself or the PEM in base64 (one line,
// easier in an env file). Without it the built-in key above is used.
function websitePublicKey(): crypto.KeyObject {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env.WEBSITE_PUBLIC_KEY?.trim();
  const pem = !fromEnv
    ? DEFAULT_WEBSITE_PUBLIC_KEY
    : fromEnv.includes("BEGIN")
      ? fromEnv.replace(/\\n/g, "\n")
      : Buffer.from(fromEnv, "base64").toString("utf8");
  cachedKey = crypto.createPublicKey(pem);
  return cachedKey;
}

export function verifyWebsiteToken(token: string, purpose: WebsiteTokenPurpose): WebsiteClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v1") return null;

    const signed = Buffer.from(`${parts[0]}.${parts[1]}`);
    const signature = Buffer.from(parts[2], "base64url");
    if (!crypto.verify("sha256", signed, websitePublicKey(), signature)) return null;

    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as WebsiteClaims;
    if (claims.iss !== ISSUER || claims.aud !== AUDIENCE || claims.purpose !== purpose) return null;
    if (typeof claims.iat !== "number" || typeof claims.exp !== "number") return null;
    if (typeof claims.nonce !== "string" || claims.nonce.length < 16 || claims.nonce.length > 128) return null;

    const now = Math.floor(Date.now() / 1000);
    if (claims.iat > now + CLOCK_SKEW) return null;
    if (claims.exp + CLOCK_SKEW < now) return null;
    if (claims.exp - claims.iat > MAX_LIFETIME[purpose]) return null;

    return claims;
  } catch {
    return null;
  }
}

// Query strings are compared as sorted key=value pairs, so the order or the
// percent-encoding the website's HTTP client happens to use cannot matter.
function canonicalQuery(search: string): string {
  return [...new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)]
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

// For /api/external/*: Authorization: SBK-Website <token>
export function verifyApiRequest(req: Request): WebsiteClaims | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^SBK-Website\s+(\S+)$/i.exec(header);
  if (!match) return null;

  const claims = verifyWebsiteToken(match[1], "api");
  if (!claims) return null;

  const url = new URL(req.url);
  if ((claims.m ?? "").toUpperCase() !== req.method.toUpperCase()) return null;
  if (claims.p !== url.pathname) return null;
  if (canonicalQuery(claims.q ?? "") !== canonicalQuery(url.search)) return null;

  return claims;
}

// One sign-in per SSO token. The table is created on first use, so no
// migration has to run on either host; rows older than a day are pruned.
let nonceTable: Promise<void> | null = null;

function ensureNonceTable(): Promise<void> {
  nonceTable ??= query(
    `CREATE TABLE IF NOT EXISTS sso_nonces (nonce text PRIMARY KEY, expires_at timestamptz NOT NULL)`
  ).then(
    () => undefined,
    (err) => {
      nonceTable = null;
      throw err;
    }
  );
  return nonceTable;
}

export async function consumeNonce(nonce: string, exp: number): Promise<boolean> {
  await ensureNonceTable();
  await query(`DELETE FROM sso_nonces WHERE expires_at < now() - interval '1 day'`);
  const rows = await query(
    `INSERT INTO sso_nonces (nonce, expires_at) VALUES ($1, to_timestamp($2))
     ON CONFLICT (nonce) DO NOTHING RETURNING nonce`,
    [nonce, exp]
  );
  return rows.length === 1;
}

// The customer an invoice belongs to, for the website: the lead's email, or the
// invoice's consignee email when the lead has none. Expects aliases i (invoices)
// and l (leads).
export const CUSTOMER_EMAIL_SQL =
  `lower(COALESCE(NULLIF(trim(l.email), ''), NULLIF(trim(i.consignee_email), '')))`;

export function invoiceNumber(id: string): string {
  return `SBK${String(id).slice(-5).toUpperCase()}`;
}

export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "file";
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
