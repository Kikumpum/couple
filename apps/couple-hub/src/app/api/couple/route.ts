import { randomBytes } from "node:crypto";
import { cloudEnabled } from "@/server/cloud-store";
import { cloudCouple } from "@/server/cloud";
import { hash, newId, requireUser, throttle, User } from "@/server/auth";
import { db, transaction } from "@/server/db";
import { disconnect } from "@/server/data";
import { body, boolean, fail, handle, text } from "@/server/http";
export const runtime = "nodejs";
export function POST(request: Request) {
  if (cloudEnabled()) return cloudCouple(request);
  return handle(async () => {
    const input = await body(request);
    const caller = requireUser(request);
    if (input.action === "invite" || input.action === "join")
      throttle(`${input.action}:${caller.id}`, 20);
    return transaction(() => {
      const user = requireUser(request);
      if (input.action === "shareHealth") {
        db()
          .prepare("UPDATE users SET shareHealth=? WHERE id=?")
          .run(boolean(input.shareHealth, "shareHealth") ? 1 : 0, user.id);
      } else if (input.action === "disconnect" || input.action === "revoke") {
        disconnect(user);
      } else if (input.action === "invite") {
        if (user.coupleId)
          fail(
            409,
            "ALREADY_LINKED",
            "Disconnect before inviting another partner.",
          );
        const token = randomBytes(32).toString("hex");
        const expiresAt = Date.now() + 24 * 3600000;
        db()
          .prepare("DELETE FROM invites WHERE userId=? OR expiresAt<=?")
          .run(user.id, Date.now());
        db()
          .prepare("INSERT INTO invites(hash,userId,expiresAt) VALUES(?,?,?)")
          .run(hash(token), user.id, expiresAt);
        return { token, expiresAt: new Date(expiresAt).toISOString() };
      } else if (input.action === "join") {
        if (input.consent !== true)
          fail(
            400,
            "CONSENT_REQUIRED",
            "Explicit consent is required to join and share non-health records.",
          );
        if (user.coupleId)
          fail(409, "ALREADY_LINKED", "Already linked to a partner.");
        const token = text(input.token, "token", 64, 64);
        const invite = db()
          .prepare("SELECT userId FROM invites WHERE hash=? AND expiresAt>?")
          .get(hash(token), Date.now()) as { userId: string } | undefined;
        if (!invite || invite.userId === user.id)
          fail(400, "INVALID_INVITE", "Invite is invalid or expired.");
        const owner = db()
          .prepare("SELECT * FROM users WHERE id=?")
          .get(invite.userId) as User;
        if (owner.coupleId)
          fail(400, "INVALID_INVITE", "Invite is invalid or expired.");
        const coupleId = newId();
        db().prepare("INSERT INTO couples(id) VALUES(?)").run(coupleId);
        db()
          .prepare(
            "UPDATE users SET coupleId=?,shareHealth=0 WHERE id IN (?,?)",
          )
          .run(coupleId, user.id, owner.id);
        db()
          .prepare("UPDATE records SET coupleId=? WHERE userId IN (?,?)")
          .run(coupleId, user.id, owner.id);
        db()
          .prepare("DELETE FROM invites WHERE userId IN (?,?)")
          .run(user.id, owner.id);
      } else fail(400, "VALIDATION", "Unknown couple action.");
      return { ok: true };
    });
  });
}
