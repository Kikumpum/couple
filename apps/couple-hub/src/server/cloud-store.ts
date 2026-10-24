import { PrismaClient, Prisma } from "@prisma/client";
import { fail } from "./http";

export type CloudTx = Prisma.TransactionClient;
let instance: PrismaClient | undefined;
let ready: Promise<void> | undefined;
export function cloudEnabled() {
  return Boolean(
    process.env.COUPLE_DATABASE_DATABASE_URL ||
      process.env.COUPLE_DATABASE_URL ||
      process.env.VERCEL,
  );
}
function client() {
  const url =
    process.env.COUPLE_DATABASE_DATABASE_URL || process.env.COUPLE_DATABASE_URL;
  if (!url)
    fail(503, "DATABASE_NOT_CONFIGURED", "Database cloud belum dikonfigurasi.");
  const connection = new URL(url);
  if (!["postgresql:", "postgres:"].includes(connection.protocol))
    fail(503, "DATABASE_NOT_CONFIGURED", "Invalid database configuration.");
  connection.searchParams.set("connection_limit", "2");
  connection.searchParams.set("pool_timeout", "15");
  if (!instance)
    instance = new PrismaClient({
      datasources: { db: { url: connection.toString() } },
    });
  return instance;
}

// Additive, namespaced tables only. Never use db push against an existing database.
const ddl = [
  `CREATE TABLE IF NOT EXISTS "couple_v2_couples" ("id" TEXT PRIMARY KEY)`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_users" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"email" TEXT NOT NULL UNIQUE,"username" TEXT UNIQUE,"password" TEXT NOT NULL,"coupleId" TEXT REFERENCES "couple_v2_couples"("id") ON DELETE SET NULL,"shareHealth" BOOLEAN NOT NULL DEFAULT FALSE,"theme" TEXT NOT NULL DEFAULT 'light',"revision" INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_records" ("id" TEXT PRIMARY KEY,"collection" TEXT NOT NULL,"userId" TEXT NOT NULL REFERENCES "couple_v2_users"("id") ON DELETE CASCADE,"coupleId" TEXT REFERENCES "couple_v2_couples"("id") ON DELETE SET NULL,"data" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS "couple_v2_records_owner" ON "couple_v2_records"("userId","collection")`,
  `CREATE INDEX IF NOT EXISTS "couple_v2_records_couple" ON "couple_v2_records"("coupleId","collection")`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_sessions" ("hash" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "couple_v2_users"("id") ON DELETE CASCADE,"expiresAt" TIMESTAMP(3) NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS "couple_v2_sessions_owner" ON "couple_v2_sessions"("userId")`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_invites" ("hash" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "couple_v2_users"("id") ON DELETE CASCADE,"expiresAt" TIMESTAMP(3) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_throttle" ("key" TEXT PRIMARY KEY,"attempts" INTEGER NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "couple_v2_migrations" ("id" TEXT PRIMARY KEY,"completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];
export async function cloudDB() {
  const db = client();
  if (!ready)
    ready = db
      .$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(20102501)`;
          for (const sql of ddl) await tx.$executeRawUnsafe(sql);
        },
        { timeout: 20000 },
      )
      .catch((error) => {
        ready = undefined;
        throw error;
      });
  await ready;
  return db;
}
export async function cloudTransaction<T>(
  callback: (tx: CloudTx) => Promise<T>,
): Promise<T> {
  const db = await cloudDB();
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034" ||
        attempt >= 2
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}
export { Prisma };
