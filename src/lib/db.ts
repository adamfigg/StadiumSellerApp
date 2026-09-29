import "server-only";
import path from "path";
import { and, eq, lte, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";
import { seed, SEED_VERSION } from "./seed";

/**
 * Postgres through Drizzle.
 * - `DATABASE_URL` set → a real Postgres server (Neon, Supabase, RDS, local install…).
 * - Not set → PGlite: real Postgres compiled to WASM, running in-process and stored in
 *   `data/pglite`, so local dev needs no install. Same schema, same SQL.
 * Migrations live in `drizzle/` (`npm run db:generate` after editing src/db/schema.ts)
 * and are applied automatically on first use.
 */

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");

type State = { db: Db; ready?: Promise<void>; readyFor?: number; migrate: () => Promise<void> };

function connect(): State {
  const url = process.env.DATABASE_URL;
  if (url) {
    /* eslint-disable @typescript-eslint/no-require-imports -- pick the driver at runtime */
    const { Pool } = require("pg") as typeof import("pg");
    const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    const { migrate } = require("drizzle-orm/node-postgres/migrator") as typeof import("drizzle-orm/node-postgres/migrator");
    const db = drizzle(new Pool({ connectionString: url }), { schema });
    return { db, migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }) };
  }
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const { migrate } = require("drizzle-orm/pglite/migrator") as typeof import("drizzle-orm/pglite/migrator");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const db = drizzle(new PGlite(path.join(process.cwd(), "data", "pglite")), { schema });
  return { db: db as unknown as Db, migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }) };
}

// One connection per process, surviving dev hot reloads (PGlite allows a single opener per folder).
const g = globalThis as unknown as { __stadiumDb?: State };
const state = (g.__stadiumDb ??= connect());

export const db = state.db;

// Demo data is topped up on every start in dev (or with STADIUM_TEST_TOOLS=1); otherwise only an empty database is seeded.
const DEMO_DATA = process.env.NODE_ENV !== "production" || process.env.STADIUM_TEST_TOOLS === "1";

/**
 * Runs migrations and seeds demo data once per process (and again in dev when SEED_VERSION
 * changes, so new demo data appears without a restart). Await before touching the database.
 */
export function dbReady(): Promise<void> {
  if (state.readyFor !== SEED_VERSION) state.ready = undefined;
  state.readyFor = SEED_VERSION;
  state.ready ??= (async () => {
    await state.migrate();
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.user);
    if (count === 0 || DEMO_DATA) await seed(db);
  })().catch((err) => {
    state.ready = undefined; // let the next request retry
    throw err;
  });
  return state.ready;
}

/** Closes open wants whose public window has passed. Call before reading wants. */
export async function expireWants() {
  await dbReady();
  await db
    .update(schema.want)
    .set({ status: "no_deal", closedReason: "expired", closedAt: sql`${schema.want.expiresAt}` })
    .where(and(eq(schema.want.status, "open"), lte(schema.want.expiresAt, sql`now()`)));
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
