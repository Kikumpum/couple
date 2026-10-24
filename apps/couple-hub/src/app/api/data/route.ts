import { requireUser, newId } from "@/server/auth";
import { cloudEnabled } from "@/server/cloud-store";
import { cloudData } from "@/server/cloud";
import { db, transaction } from "@/server/db";
import { accessibleGoal, clearGoalLinks, Row, snapshot } from "@/server/data";
import { body, fail, handle, id, object } from "@/server/http";
import { collection, validateRecord } from "@/server/records";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  if (cloudEnabled()) return cloudData(request);
  return handle(() => snapshot(requireUser(request)));
}
async function mutate(request: Request, method: string) {
  const input = await body(request);
  return transaction(() => {
    const user = requireUser(request);
    const c = collection(input.collection);
    const recordId = method === "POST" ? newId() : id(input.id);
    const existing =
      method === "POST"
        ? undefined
        : (db()
            .prepare(
              "SELECT * FROM records WHERE id=? AND userId=? AND collection=?",
            )
            .get(recordId, user.id, c) as Row | undefined);
    if (method !== "POST" && !existing)
      fail(404, "NOT_FOUND", "Record not found.");
    if (method === "DELETE") {
      if (c === "goals") clearGoalLinks(recordId);
      db()
        .prepare("DELETE FROM records WHERE id=? AND userId=?")
        .run(recordId, user.id);
    } else {
      const fields = validateRecord(
        c,
        existing
          ? { ...JSON.parse(existing.data), ...object(input.record) }
          : input.record,
      );
      if (c === "watchlist") {
        const watches = db()
          .prepare(
            "SELECT id,data FROM records WHERE userId=? AND collection='watchlist'",
          )
          .all(user.id) as { id: string; data: string }[];
        const group = watches.filter(
          (w) =>
            JSON.parse(w.data).market === fields.market && w.id !== recordId,
        );
        if (group.length >= 12)
          fail(409, "RECORD_LIMIT", "Maksimal 12 aset per pasar.");
        if (group.some((w) => JSON.parse(w.data).symbol === fields.symbol))
          fail(409, "DUPLICATE", "Aset ini sudah ada dalam pantauanmu.");
      }
      if (c === "finances") accessibleGoal(user, fields.goalId);
      if (c === "periods") {
        const duplicate = db()
          .prepare(
            "SELECT id FROM records WHERE userId=? AND collection='periods' AND json_extract(data,'$.startDate')=? AND id<>?",
          )
          .get(user.id, fields.startDate as string, recordId);
        if (duplicate)
          fail(409, "DUPLICATE", "Catatan siklus pada tanggal ini sudah ada.");
      }
      const now = new Date().toISOString();
      if (existing)
        db()
          .prepare(
            "UPDATE records SET data=?,updatedAt=? WHERE id=? AND userId=?",
          )
          .run(JSON.stringify(fields), now, recordId, user.id);
      else {
        const count = db()
          .prepare("SELECT count(*) AS n FROM records WHERE userId=?")
          .get(user.id) as { n: number };
        if (count.n >= 10000)
          fail(409, "RECORD_LIMIT", "Account record limit reached.");
        db()
          .prepare(
            "INSERT INTO records(id,collection,userId,coupleId,data,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)",
          )
          .run(
            recordId,
            c,
            user.id,
            user.coupleId,
            JSON.stringify(fields),
            now,
            now,
          );
      }
    }
    return snapshot(user);
  });
}
export function POST(request: Request) {
  if (cloudEnabled()) return cloudData(request);
  return handle(() => mutate(request, "POST"));
}
export function PATCH(request: Request) {
  if (cloudEnabled()) return cloudData(request);
  return handle(() => mutate(request, "PATCH"));
}
export function DELETE(request: Request) {
  if (cloudEnabled()) return cloudData(request);
  return handle(() => mutate(request, "DELETE"));
}
