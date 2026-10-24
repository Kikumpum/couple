import { timingSafeEqual } from "node:crypto";
import { hash } from "@/server/auth";
import { cloudDB, cloudTransaction, Prisma } from "@/server/cloud-store";
import { body, handle, fail, id, text, object } from "@/server/http";
import { collection, validateRecord } from "@/server/records";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Temporary, authenticated, one-shot import. No overwrite or session migration.
export function POST(request: Request) {
  return handle(async () => {
    const expected = process.env.COUPLE_MIGRATION_TOKEN;
    const supplied =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    if (
      !expected ||
      supplied.length > 200 ||
      !timingSafeEqual(Buffer.from(hash(expected)), Buffer.from(hash(supplied)))
    )
      fail(404, "NOT_FOUND", "Not found.");
    const db = await cloudDB();
    if (await db.hubMigration.count())
      fail(410, "IMPORT_COMPLETED", "Import is already sealed.");
    const input = await body(request, 2 * 1024 * 1024);
    if (
      !Array.isArray(input.users) ||
      !Array.isArray(input.records) ||
      !Array.isArray(input.couples) ||
      input.users.length !== 2 ||
      input.records.length > 10000
    )
      fail(400, "VALIDATION", "Invalid import.");
    const users = input.users.map((value) => {
      const u = object(value);
      const username = text(u.username, "username", 30, 3);
      if (
        !["aryo", "fia"].includes(username) ||
        !/^s2:[a-f0-9]{32}:[a-f0-9]{128}$/.test(String(u.password))
      )
        fail(400, "VALIDATION", "Invalid account import.");
      return {
        id: id(u.id),
        name: text(u.name, "name", 80, 1),
        email: text(u.email, "email", 254, 3),
        username,
        password: u.password as string,
        coupleId: u.coupleId ? id(u.coupleId) : null,
        shareHealth: u.shareHealth === true || u.shareHealth === 1,
        theme: u.theme === "dark" ? "dark" : "light",
      };
    });
    if (new Set(users.map((u) => u.username)).size !== 2)
      fail(400, "VALIDATION", "Duplicate users.");
    const couples = input.couples.map((value) => ({
      id: id(object(value).id),
    }));
    for (const couple of couples)
      if (users.filter((u) => u.coupleId === couple.id).length !== 2)
        fail(400, "VALIDATION", "Incomplete couple.");
    const records = input.records.map((value) => {
      const r = object(value);
      const owner = users.find((u) => u.id === r.userId);
      if (!owner) fail(400, "VALIDATION", "Invalid owner.");
      const c = collection(r.collection);
      const fields = validateRecord(c, object(r.data));
      if ((r.coupleId || null) !== owner.coupleId)
        fail(400, "VALIDATION", "Invalid membership.");
      const createdAt = new Date(text(r.createdAt, "createdAt", 50, 10));
      const updatedAt = new Date(text(r.updatedAt, "updatedAt", 50, 10));
      if (
        !Number.isFinite(createdAt.getTime()) ||
        !Number.isFinite(updatedAt.getTime())
      )
        fail(400, "VALIDATION", "Invalid timestamp.");
      return {
        id: id(r.id),
        collection: c,
        userId: owner.id,
        coupleId: owner.coupleId,
        data: fields as Prisma.InputJsonObject,
        createdAt,
        updatedAt,
      };
    });
    const checksum = hash(JSON.stringify(input));
    await cloudTransaction(async (tx) => {
      if (
        (await tx.hubUser.count()) ||
        (await tx.hubRecord.count()) ||
        (await tx.hubMigration.count())
      )
        fail(
          409,
          "IMPORT_NOT_EMPTY",
          "Target must be empty; nothing was overwritten.",
        );
      if (couples.length) await tx.hubCouple.createMany({ data: couples });
      await tx.hubUser.createMany({ data: users });
      if (records.length) await tx.hubRecord.createMany({ data: records });
      await tx.hubMigration.create({ data: { id: checksum } });
    });
    return { ok: true, users: users.length, records: records.length, checksum };
  });
}
