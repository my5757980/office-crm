import bcryptjs from "bcryptjs";
import { query, queryOne } from "@/lib/pg";

// The public "Reset Credentials" page (/forgot-password) only works for someone who knows the
// recovery key an admin set under My Profile. Only its bcrypt hash is stored, in app_settings,
// which both hosts share through the one database (like the WooCommerce keys).
const SETTING = "credential_reset_key_hash";
export const MIN_RECOVERY_KEY_LENGTH = 12;

/** The stored hash, or null when no key has been set (the reset page then refuses everyone). */
export async function getRecoveryKeyHash(): Promise<string | null> {
  try {
    const row = await queryOne<{ value: string }>(`SELECT value FROM app_settings WHERE key = $1`, [SETTING]);
    return row?.value || null;
  } catch {
    return null; // no app_settings table yet: treat as "not set"
  }
}

export async function setRecoveryKey(plain: string): Promise<void> {
  const hash = await bcryptjs.hash(plain, 12);
  await query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const updated = await query(`UPDATE app_settings SET value = $2 WHERE key = $1 RETURNING key`, [SETTING, hash]);
  if (updated.length === 0) {
    await query(`INSERT INTO app_settings (key, value) VALUES ($1, $2)`, [SETTING, hash]);
  }
}
