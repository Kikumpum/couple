import { db } from "./db";
import { publicUser, User } from "./auth";
import { collections, Collection } from "./records";
import { fail } from "./http";

export type Row = {
  id: string;
  userId: string;
  coupleId: string | null;
  collection: Collection;
  data: string;
  createdAt: string;
  updatedAt: string;
};
export function accessibleGoal(user: User, goalId: unknown) {
  if (goalId == null) return;
  const goal = db()
    .prepare(
      "SELECT id FROM records WHERE id=? AND collection='goals' AND (userId=? OR (coupleId=? AND ? IS NOT NULL))",
    )
    .get(goalId as string, user.id, user.coupleId, user.coupleId);
  if (!goal) fail(400, "INVALID_GOAL", "Goal unavailable.");
}
export function snapshot(user: User) {
  // Re-read membership and consent on every snapshot, never rely on caller's stale identity.
  user = db().prepare("SELECT * FROM users WHERE id=?").get(user.id) as User;
  if (!user) fail(401, "UNAUTHENTICATED", "Please sign in.");
  const partner = user.coupleId
    ? (db()
        .prepare(
          "SELECT id,name,shareHealth FROM users WHERE coupleId=? AND id<>?",
        )
        .get(user.coupleId, user.id) as
        | { id: string; name: string; shareHealth: number }
        | undefined)
    : undefined;
  const result = {
    user: publicUser(user),
    partner: partner
      ? { ...partner, shareHealth: Boolean(partner.shareHealth) }
      : null,
    finances: [],
    goals: [],
    periods: [],
    books: [],
    plans: [],
    reminders: [],
    investments: [],
    watchlist: [],
  } as {
    user: ReturnType<typeof publicUser>;
    partner: { id: string; name: string; shareHealth: boolean } | null;
  } & Record<Collection, unknown[]>;
  const rows = db()
    .prepare(
      `SELECT r.* FROM records r JOIN users owner ON owner.id=r.userId
    WHERE r.userId=? OR (r.coupleId=? AND owner.coupleId=? AND ? IS NOT NULL
      AND r.collection<>'watchlist' AND (r.collection<>'periods' OR owner.shareHealth=1)) ORDER BY r.createdAt DESC,r.id`,
    )
    .all(user.id, user.coupleId, user.coupleId, user.coupleId) as Row[];
  for (const row of rows) {
    if (collections.includes(row.collection))
      result[row.collection].push({
        ...JSON.parse(row.data),
        id: row.id,
        userId: row.userId,
        coupleId: row.coupleId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
  }
  return result;
}
export function clearGoalLinks(goalId: string) {
  db()
    .prepare(
      "UPDATE records SET data=json_set(data,'$.goalId',NULL),updatedAt=? WHERE collection='finances' AND json_extract(data,'$.goalId')=?",
    )
    .run(new Date().toISOString(), goalId);
}
export function disconnect(user: User) {
  db().prepare("DELETE FROM invites WHERE userId=?").run(user.id);
  if (!user.coupleId) return;
  // Clear cross-owner goal references before records become private again.
  db()
    .prepare(
      `UPDATE records SET data=json_set(data,'$.goalId',NULL),updatedAt=?
    WHERE collection='finances' AND coupleId=? AND json_extract(data,'$.goalId') IN
    (SELECT g.id FROM records g WHERE g.collection='goals' AND g.userId<>records.userId)`,
    )
    .run(new Date().toISOString(), user.coupleId);
  db()
    .prepare(
      "DELETE FROM invites WHERE userId IN (SELECT id FROM users WHERE coupleId=?)",
    )
    .run(user.coupleId);
  db()
    .prepare("UPDATE records SET coupleId=NULL WHERE coupleId=?")
    .run(user.coupleId);
  db()
    .prepare("UPDATE users SET coupleId=NULL,shareHealth=0 WHERE coupleId=?")
    .run(user.coupleId);
  db().prepare("DELETE FROM couples WHERE id=?").run(user.coupleId);
}
