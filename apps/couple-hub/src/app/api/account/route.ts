import { logout, password, requireUser, throttle, verify } from "@/server/auth";
import { body, fail, handle, json } from "@/server/http";
import { db, transaction } from "@/server/db";
import { clearGoalLinks, disconnect } from "@/server/data";
export const runtime = "nodejs";
export function PATCH(request: Request) {
  return handle(async () => {
    const input = await body(request);
    const user = requireUser(request);
    if (input.theme !== "light" && input.theme !== "dark")
      fail(400, "VALIDATION", "Invalid theme.");
    db()
      .prepare("UPDATE users SET theme=? WHERE id=?")
      .run(input.theme, user.id);
    return { ok: true };
  });
}
export function DELETE(request: Request) {
  return handle(async () => {
    const input = await body(request);
    const user = requireUser(request);
    throttle(`delete:${user.id}`, 5);
    if (!(await verify(password(input.password), user.password)))
      fail(401, "INVALID_CREDENTIALS", "Invalid password.");
    transaction(() => {
      const fresh = requireUser(request);
      disconnect(fresh);
      const goals = db()
        .prepare("SELECT id FROM records WHERE userId=? AND collection='goals'")
        .all(user.id) as { id: string }[];
      for (const goal of goals) clearGoalLinks(goal.id);
      db().prepare("DELETE FROM users WHERE id=?").run(user.id);
    });
    return json({ ok: true }, 200, { "Set-Cookie": logout(request) });
  });
}
