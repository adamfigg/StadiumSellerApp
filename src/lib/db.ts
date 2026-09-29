import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

/**
 * Tiny JSON-file store so the base version runs with zero setup.
 * Everything goes through readDb / mutateDb, so swapping in a real
 * database (Postgres + Prisma/Drizzle) later only touches this file.
 */

// Paths are written out in full so Next's file tracing stays scoped to ./data.
export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const DB_FILE = path.join(process.cwd(), "data", "db.json");
export const uploadPath = (name: string) => path.join(process.cwd(), "data", "uploads", name);

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Database> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as Database;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const seed = buildSeed();
    await save(seed);
    return seed;
  }
}

async function save(db: Database) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Closes open wants whose public window has passed. */
function expireWants(db: Database): boolean {
  const now = Date.now();
  let changed = false;
  for (const want of db.wants) {
    if (want.status === "open" && Date.parse(want.expiresAt) <= now) {
      want.status = "no_deal";
      want.closedReason = "expired";
      want.closedAt = want.expiresAt;
      changed = true;
    }
  }
  return changed;
}

/** Every read and write goes through one queue, so first-run seeding and concurrent actions can't race. */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job);
  queue = run.catch(() => undefined);
  return run;
}

export function readDb(): Promise<Database> {
  return enqueue(async () => {
    const db = await load();
    if (expireWants(db)) await save(db);
    return db;
  });
}

export function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  return enqueue(async () => {
    const db = await load();
    expireWants(db);
    const result = await fn(db);
    await save(db);
    return result;
  });
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
