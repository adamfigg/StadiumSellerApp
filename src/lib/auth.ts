import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { db } from "./db";

/**
 * Better Auth: email + password accounts stored in Postgres.
 * Every account is a buyer, so sign-up collects what a buyer needs to post a want:
 * name, email, password and location (city + state, used for local-preferred posts).
 * Needs BETTER_AUTH_SECRET (and BETTER_AUTH_URL outside localhost); see .env.example.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    // No email service yet. Turn this on with a sendVerificationEmail hook once there is one.
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      city: { type: "string", required: true, input: true },
      state: { type: "string", required: true, input: true },
    },
  },
  plugins: [nextCookies()], // lets server actions set the session cookie; keep last
});
