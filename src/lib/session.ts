import "server-only";
import { cookies } from "next/headers";
import { readDb } from "./db";
import type { User } from "./types";

export const USER_COOKIE = "stadium_user";

/**
 * Demo "auth": the header's account switcher sets a cookie with a user id.
 * Replace with real auth (Auth.js / Clerk) once accounts exist.
 */
export async function getCurrentUser(): Promise<User> {
  const db = await readDb();
  const id = (await cookies()).get(USER_COOKIE)?.value;
  return db.users.find((u) => u.id === id) ?? db.users[0];
}
