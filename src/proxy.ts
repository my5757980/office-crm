import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // api/external is the SBK website's read API: it carries its own signed
  // Authorization header (src/lib/website-link.ts), not a CRM session.
  matcher: ["/((?!api/auth|api/admin/local-migrate|api/external|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf)).*)"],
};
