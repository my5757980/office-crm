import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { authConfig } from "./auth.config";
import { queryOne } from "./pg";
import { consumeNonce, verifyWebsiteToken } from "./website-link";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await queryOne<UserRow>(
          "SELECT id, name, email, password, role FROM users WHERE email = $1 AND is_active = true",
          [(credentials.email as string).toLowerCase()]
        );

        if (!user) return null;

        const isValid = await bcryptjs.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // "CRM Global" on the SBK website: a signed, single-use link for the email
    // the person is logged in with there. Only an active CRM user with exactly
    // that email is signed in. See src/app/api/auth/sso/route.ts.
    CredentialsProvider({
      id: "website-sso",
      name: "website-sso",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = typeof credentials?.token === "string" ? credentials.token : "";
        const claims = verifyWebsiteToken(token, "sso");
        if (!claims?.sub) return null;
        if (!(await consumeNonce(claims.nonce, claims.exp))) return null;

        const user = await queryOne<Omit<UserRow, "password">>(
          "SELECT id, name, email, role FROM users WHERE email = $1 AND is_active = true",
          [claims.sub.toLowerCase()]
        );
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
