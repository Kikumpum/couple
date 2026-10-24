import { randomBytes } from "node:crypto";
import type { HubUser } from "@prisma/client";
import { cloudDB, cloudTransaction, Prisma, type CloudTx } from "./cloud-store";
import {
  hash,
  newId,
  passwordHash,
  verify,
  email,
  username,
  password,
} from "./auth";
import { body, fail, handle, id, json, object, text, boolean } from "./http";
import {
  collections,
  collection,
  validateRecord,
  type Collection,
} from "./records";

const publicUser = (u: HubUser) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  username: u.username,
  coupleId: u.coupleId,
  shareHealth: u.shareHealth,
  theme: u.theme,
});
const sessionHash = (request: Request) => {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("couple_session="))
    ?.slice(15);
  return token && /^[a-f0-9]{64}$/.test(token) ? hash(token) : null;
};
const cookie = (token: string, maxAge = 7 * 86400) =>
  `couple_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
export async function cloudUser(
  request: Request,
  required = true,
  tx?: CloudTx,
) {
  const db = tx || (await cloudDB());
  const key = sessionHash(request);
  const session = key
    ? await db.hubSession.findFirst({
        where: { hash: key, expiresAt: { gt: new Date() } },
        include: { user: true },
      })
    : null;
  if (!session && required) fail(401, "UNAUTHENTICATED", "Please sign in.");
  return session?.user ?? null;
}
export async function cloudThrottle(
  key: string,
  limit = 10,
  windowMs = 15 * 60000,
) {
  const db = await cloudDB();
  const now = new Date();
  const until = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<
    { attempts: number }[]
  >`INSERT INTO "couple_v2_throttle" ("key","attempts","expiresAt") VALUES (${hash(key)},1,${until}) ON CONFLICT ("key") DO UPDATE SET "attempts"=CASE WHEN "couple_v2_throttle"."expiresAt"<=${now} THEN 1 ELSE "couple_v2_throttle"."attempts"+1 END,"expiresAt"=CASE WHEN "couple_v2_throttle"."expiresAt"<=${now} THEN ${until} ELSE "couple_v2_throttle"."expiresAt" END RETURNING "attempts"`;
  if (rows[0].attempts > limit) fail(429, "RATE_LIMITED", "Too many attempts.");
}
async function change(tx: CloudTx, u: HubUser, privateOnly = false) {
  await tx.hubUser.updateMany({
    where:
      privateOnly || !u.coupleId
        ? { id: u.id }
        : { OR: [{ id: u.id }, { coupleId: u.coupleId }] },
    data: { revision: { increment: 1 } },
  });
}
async function snapshot(u: HubUser, tx?: CloudTx) {
  const db = tx || (await cloudDB());
  const user = await db.hubUser.findUnique({ where: { id: u.id } });
  if (!user) fail(401, "UNAUTHENTICATED", "Please sign in.");
  const partner = user.coupleId
    ? await db.hubUser.findFirst({
        where: { coupleId: user.coupleId, id: { not: user.id } },
        select: { id: true, name: true, shareHealth: true },
      })
    : null;
  const rows = await db.hubRecord.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.coupleId
          ? [
              {
                coupleId: user.coupleId,
                owner: { coupleId: user.coupleId },
                OR: [
                  { collection: { notIn: ["watchlist", "periods"] } },
                  { collection: "periods", owner: { shareHealth: true } },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  const result = {
    user: publicUser(user),
    partner,
    ...Object.fromEntries(collections.map((c) => [c, []])),
  } as {
    user: ReturnType<typeof publicUser>;
    partner: typeof partner;
  } & Record<Collection, unknown[]>;
  for (const row of rows)
    if (collections.includes(row.collection as Collection))
      result[row.collection as Collection].push({
        ...object(row.data),
        id: row.id,
        userId: row.userId,
        coupleId: row.coupleId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
  return result;
}
async function clearGoal(tx: CloudTx, goalId: string) {
  await tx.$executeRaw`UPDATE "couple_v2_records" SET "data"=jsonb_set("data",'{goalId}','null'::jsonb),"updatedAt"=CURRENT_TIMESTAMP WHERE "collection"='finances' AND "data"->>'goalId'=${goalId}`;
}
async function disconnect(tx: CloudTx, u: HubUser) {
  await tx.hubInvite.deleteMany({ where: { userId: u.id } });
  if (!u.coupleId) return;
  await change(tx, u);
  await tx.$executeRaw`UPDATE "couple_v2_records" r SET "data"=jsonb_set(r."data",'{goalId}','null'::jsonb),"updatedAt"=CURRENT_TIMESTAMP WHERE r."collection"='finances' AND r."coupleId"=${u.coupleId} AND r."data"->>'goalId' IN(SELECT g."id" FROM "couple_v2_records" g WHERE g."collection"='goals' AND g."userId"<>r."userId")`;
  await tx.hubInvite.deleteMany({ where: { user: { coupleId: u.coupleId } } });
  await tx.hubRecord.updateMany({
    where: { coupleId: u.coupleId },
    data: { coupleId: null },
  });
  await tx.hubUser.updateMany({
    where: { coupleId: u.coupleId },
    data: { coupleId: null, shareHealth: false },
  });
  await tx.hubCouple.delete({ where: { id: u.coupleId } });
}
export function cloudAuth(request: Request) {
  return handle(async () => {
    if (request.method === "GET") {
      const u = await cloudUser(request, false);
      return u ? snapshot(u) : { user: null };
    }
    const input = await body(request);
    const db = await cloudDB();
    if (input.action === "logout") {
      const key = sessionHash(request);
      if (key) await db.hubSession.deleteMany({ where: { hash: key } });
      return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
    }
    if (input.action !== "login" && input.action !== "register")
      fail(400, "VALIDATION", "Invalid action.");
    if (
      input.action === "register" &&
      process.env.COUPLE_MIGRATION_TOKEN &&
      !(await db.hubMigration.count())
    )
      fail(503, "IMPORT_PENDING", "Migrasi data sedang berlangsung.");
    const secret = password(input.password);
    const registering = input.action === "register";
    const name =
      registering && input.username ? username(input.username) : null;
    const address = registering
      ? input.email
        ? email(input.email)
        : name
          ? `${name}@accounts.invalid`
          : email(input.email)
      : text(
          input.identifier ?? input.email ?? input.username,
          "identifier",
          254,
          3,
        ).toLowerCase();
    const normalized = address.includes("@")
      ? email(address)
      : username(address);
    await cloudThrottle("auth:global", 300);
    await cloudThrottle(`auth:${normalized}`);
    let u = await db.hubUser.findUnique({
      where: normalized.includes("@")
        ? { email: normalized }
        : { username: normalized },
    });
    if (registering) {
      const encoded = await passwordHash(secret);
      if (u) fail(409, "REGISTRATION_FAILED", "Unable to register.");
      try {
        u = await db.hubUser.create({
          data: {
            id: newId(),
            name: text(input.name, "name", 80, 1),
            email: normalized,
            username: name,
            password: encoded,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        )
          fail(409, "REGISTRATION_FAILED", "Unable to register.");
        throw e;
      }
    } else if (
      !(await verify(
        secret,
        u?.password ?? `s2:${"0".repeat(32)}:${"0".repeat(128)}`,
      )) ||
      !u
    )
      fail(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    if (!u) fail(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    const token = randomBytes(32).toString("hex");
    await db.hubSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await db.hubSession.create({
      data: {
        hash: hash(token),
        userId: u.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const old = await db.hubSession.findMany({
      where: { userId: u.id },
      orderBy: { expiresAt: "desc" },
      skip: 10,
      select: { hash: true },
    });
    if (old.length)
      await db.hubSession.deleteMany({
        where: { hash: { in: old.map((s) => s.hash) } },
      });
    return json(await snapshot(u), 200, { "Set-Cookie": cookie(token) });
  });
}
export function cloudData(request: Request) {
  return handle(async () => {
    if (request.method === "GET") return snapshot((await cloudUser(request))!);
    const input = await body(request);
    return cloudTransaction(async (tx) => {
      const u = (await cloudUser(request, true, tx))!;
      const c = collection(input.collection);
      const rid = request.method === "POST" ? newId() : id(input.id);
      const previous =
        request.method === "POST"
          ? null
          : await tx.hubRecord.findFirst({
              where: { id: rid, userId: u.id, collection: c },
            });
      if (request.method !== "POST" && !previous)
        fail(404, "NOT_FOUND", "Record not found.");
      if (request.method === "DELETE") {
        if (c === "goals") await clearGoal(tx, rid);
        await tx.hubRecord.delete({ where: { id: rid } });
      } else {
        const fields = validateRecord(
          c,
          previous
            ? { ...object(previous.data), ...object(input.record) }
            : input.record,
        );
        if (c === "finances" && fields.goalId) {
          const goal = await tx.hubRecord.findFirst({
            where: {
              id: fields.goalId as string,
              collection: "goals",
              OR: [
                { userId: u.id },
                ...(u.coupleId ? [{ coupleId: u.coupleId }] : []),
              ],
            },
          });
          if (!goal) fail(400, "INVALID_GOAL", "Goal unavailable.");
        }
        if (c === "watchlist") {
          const rows = await tx.hubRecord.findMany({
            where: { userId: u.id, collection: c, id: { not: rid } },
          });
          const group = rows.filter(
            (r) => object(r.data).market === fields.market,
          );
          if (group.length >= 12)
            fail(409, "RECORD_LIMIT", "Watchlist limit reached.");
          if (group.some((r) => object(r.data).symbol === fields.symbol))
            fail(409, "DUPLICATE", "Asset already exists.");
        }
        if (
          c === "periods" &&
          (await tx.hubRecord.findFirst({
            where: {
              userId: u.id,
              collection: c,
              id: { not: rid },
              data: { path: ["startDate"], equals: fields.startDate as string },
            },
          }))
        )
          fail(409, "DUPLICATE", "Period already exists.");
        if (previous)
          await tx.hubRecord.update({
            where: { id: rid },
            data: { data: fields as Prisma.InputJsonObject },
          });
        else {
          if ((await tx.hubRecord.count({ where: { userId: u.id } })) >= 10000)
            fail(409, "RECORD_LIMIT", "Record limit reached.");
          await tx.hubRecord.create({
            data: {
              id: rid,
              collection: c,
              userId: u.id,
              coupleId: u.coupleId,
              data: fields as Prisma.InputJsonObject,
            },
          });
        }
      }
      await change(tx, u, c === "watchlist");
      return snapshot(u, tx);
    });
  });
}
export function cloudCouple(request: Request) {
  return handle(async () => {
    const input = await body(request);
    const caller = (await cloudUser(request))!;
    if (input.action === "invite" || input.action === "join")
      await cloudThrottle(`${input.action}:${caller.id}`, 20);
    return cloudTransaction(async (tx) => {
      const u = (await cloudUser(request, true, tx))!;
      if (input.action === "shareHealth") {
        await tx.hubUser.update({
          where: { id: u.id },
          data: { shareHealth: boolean(input.shareHealth, "shareHealth") },
        });
        await change(tx, u);
      } else if (input.action === "disconnect" || input.action === "revoke")
        await disconnect(tx, u);
      else if (input.action === "invite") {
        if (u.coupleId) fail(409, "ALREADY_LINKED", "Already linked.");
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 86400000);
        await tx.hubInvite.deleteMany({
          where: { OR: [{ userId: u.id }, { expiresAt: { lte: new Date() } }] },
        });
        await tx.hubInvite.create({
          data: { hash: hash(token), userId: u.id, expiresAt },
        });
        return { token, expiresAt: expiresAt.toISOString() };
      } else if (input.action === "join") {
        if (input.consent !== true)
          fail(400, "CONSENT_REQUIRED", "Explicit consent required.");
        if (u.coupleId) fail(409, "ALREADY_LINKED", "Already linked.");
        const invite = await tx.hubInvite.findFirst({
          where: {
            hash: hash(text(input.token, "token", 64, 64)),
            expiresAt: { gt: new Date() },
          },
          include: { user: true },
        });
        if (!invite || invite.userId === u.id || invite.user.coupleId)
          fail(400, "INVALID_INVITE", "Invalid invite.");
        const coupleId = newId();
        await tx.hubCouple.create({ data: { id: coupleId } });
        const ids = [u.id, invite.userId];
        await tx.hubUser.updateMany({
          where: { id: { in: ids } },
          data: { coupleId, shareHealth: false, revision: { increment: 1 } },
        });
        await tx.hubRecord.updateMany({
          where: { userId: { in: ids } },
          data: { coupleId },
        });
        await tx.hubInvite.deleteMany({ where: { userId: { in: ids } } });
      } else fail(400, "VALIDATION", "Unknown action.");
      return { ok: true };
    });
  });
}
export function cloudAccount(request: Request) {
  return handle(async () => {
    const input = await body(request);
    const u = (await cloudUser(request))!;
    if (request.method === "PATCH") {
      if (input.theme !== "dark" && input.theme !== "light")
        fail(400, "VALIDATION", "Invalid theme.");
      const db = await cloudDB();
      await db.hubUser.update({
        where: { id: u.id },
        data: { theme: input.theme, revision: { increment: 1 } },
      });
      return { ok: true };
    }
    await cloudThrottle(`delete:${u.id}`, 5);
    if (!(await verify(password(input.password), u.password)))
      fail(401, "INVALID_CREDENTIALS", "Invalid password.");
    await cloudTransaction(async (tx) => {
      const fresh = (await cloudUser(request, true, tx))!;
      await disconnect(tx, fresh);
      const goals = await tx.hubRecord.findMany({
        where: { userId: u.id, collection: "goals" },
        select: { id: true },
      });
      for (const g of goals) await clearGoal(tx, g.id);
      await tx.hubUser.delete({ where: { id: u.id } });
    });
    return json({ ok: true }, 200, { "Set-Cookie": cookie("", 0) });
  });
}
export function cloudEvents(request: Request) {
  return handle(async () => {
    const u = (await cloudUser(request))!;
    await cloudThrottle(`events:${u.id}`, 60, 60000);
    let timer: ReturnType<typeof setInterval> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    let busy = false;
    let stop = () => {};
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        let previous = -1;
        stop = () => {
          if (finished) return;
          finished = true;
          clearInterval(timer);
          clearTimeout(expiry);
          request.signal.removeEventListener("abort", stop);
          try {
            controller.close();
          } catch {}
        };
        const tick = async () => {
          if (finished || busy) return;
          busy = true;
          try {
            const fresh = await cloudUser(request, false);
            if (finished) return;
            if (!fresh) {
              controller.enqueue(
                encoder.encode("event: signed-out\ndata: {}\n\n"),
              );
              stop();
              return;
            }
            if (previous !== fresh.revision) {
              previous = fresh.revision;
              controller.enqueue(
                encoder.encode(`event: change\ndata: ${previous}\n\n`),
              );
            } else controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            stop();
          } finally {
            busy = false;
          }
        };
        controller.enqueue(encoder.encode("retry: 2000\n\n"));
        request.signal.addEventListener("abort", stop, { once: true });
        void tick();
        timer = setInterval(() => void tick(), 2000);
        expiry = setTimeout(stop, 50000);
      },
      cancel() {
        stop();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
