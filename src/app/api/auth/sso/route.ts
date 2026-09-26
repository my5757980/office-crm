// "CRM Global" on the SBK website lands here with a signed, single-use token
// for the email the person is logged in with on the website. A matching active
// CRM user is signed in and sent to the dashboard without being asked for a
// password; anyone else goes to the normal login page with a short note.
import { NextRequest } from "next/server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { queryOne } from "@/lib/pg";
import { verifyWebsiteToken } from "@/lib/website-link";

// A relative Location keeps the redirect on whichever host served the request
// (crmglobal behind cPanel's proxy, or Vercel).
function toLogin(reason: "invalid" | "nomatch") {
  return new Response(null, { status: 302, headers: { Location: `/login?sso=${reason}` } });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  // Checked here first only to tell "bad link" from "no such CRM user"; the
  // provider repeats the check and is the one that uses up the token.
  const claims = verifyWebsiteToken(token, "sso");
  if (!claims?.sub) return toLogin("invalid");

  const user = await queryOne<{ id: string }>(
    "SELECT id FROM users WHERE email = $1 AND is_active = true",
    [claims.sub.toLowerCase()]
  );
  if (!user) return toLogin("nomatch");

  // redirect: false - the session cookie is still set, and the redirect below
  // stays on this host even where NEXTAUTH_URL names the other one.
  let result: unknown;
  try {
    result = await signIn("website-sso", { token, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return toLogin("invalid");
    throw error;
  }
  if (typeof result === "string" && /[?&]error=/.test(result)) return toLogin("invalid");

  return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
}
