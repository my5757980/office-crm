import { randomBytes } from "crypto";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export function genId(): string {
  return randomBytes(12).toString("hex");
}

const DATABASE_URL = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var neonSql: NeonQueryFunction<false, false> | undefined;
}

function getSql(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  if (!global.neonSql) {
    global.neonSql = neon(DATABASE_URL);
  }

  return global.neonSql;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const sql = getSql();
  const rows = await sql.query(text, params as unknown[]);
  return rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
