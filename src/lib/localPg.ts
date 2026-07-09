import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var localPgPool: Pool | undefined;
}

function getPool(): Pool {
  const url = process.env.LOCAL_DATABASE_URL;
  if (!url) {
    throw new Error("LOCAL_DATABASE_URL is not defined in environment variables");
  }
  if (!global.localPgPool) {
    global.localPgPool = new Pool({ connectionString: url, max: 3 });
  }
  return global.localPgPool;
}

export async function localQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = getPool();
  const res = await pool.query(text, params);
  return res.rows as T[];
}
