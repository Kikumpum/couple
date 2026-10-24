import { db } from "@/server/db";
import { body, fail, handle, json, text } from "@/server/http";
import {
  createSession,
  currentUser,
  email,
  logout,
  newId,
  password,
  passwordHash,
  throttle,
  User,
  verify,
  username,
} from "@/server/auth";
import { snapshot } from "@/server/data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handle(() => {
    const user = currentUser(request);
    return user
      ? snapshot(user)
      : {
          user: null,
          partner: null,
          finances: [],
          goals: [],
          periods: [],
          books: [],
          plans: [],
          reminders: [],
          investments: [],
          watchlist: [],
        };
  });
}
export function POST(request: Request) {
  return handle(async () => {
    const input = await body(request);
    if (input.action === "logout")
      return json({ ok: true }, 200, { "Set-Cookie": logout(request) });
    if (input.action !== "login" && input.action !== "register")
      fail(400, "VALIDATION", "Unknown auth action.");
    const secret = password(input.password);
    const registering = input.action === "register";
    const userName =
      registering && input.username ? username(input.username) : null;
    const identifier = registering
      ? input.email
        ? email(input.email)
        : userName
          ? `${userName}@accounts.invalid`
          : email(input.email)
      : text(
          input.identifier ?? input.email ?? input.username,
          "identifier",
          254,
          3,
        ).toLowerCase();
    const byEmail = identifier.includes("@");
    const address = byEmail ? email(identifier) : username(identifier);
    throttle(`auth:${address}`);
    throttle("auth:global", 300);
    let user = db()
      .prepare(
        byEmail
          ? "SELECT * FROM users WHERE email=?"
          : "SELECT * FROM users WHERE username=?",
      )
      .get(address) as User | undefined;
    if (input.action === "register") {
      const name = text(input.name, "name", 80, 1);
      const encoded = await passwordHash(secret);
      if (user)
        fail(
          409,
          "REGISTRATION_FAILED",
          "Unable to register with these details.",
        );
      const uid = newId();
      try {
        db()
          .prepare(
            "INSERT INTO users(id,name,email,password,username) VALUES(?,?,?,?,?)",
          )
          .run(uid, name, address, encoded, userName);
      } catch (error) {
        if (String(error).includes("UNIQUE"))
          fail(
            409,
            "REGISTRATION_FAILED",
            "Unable to register with these details.",
          );
        throw error;
      }
      user = db().prepare("SELECT * FROM users WHERE id=?").get(uid) as User;
    } else {
      // Perform identical scrypt work for unknown addresses to reduce enumeration timing.
      const encoded =
        user?.password ?? `s2:${"0".repeat(32)}:${"0".repeat(128)}`;
      if (!(await verify(secret, encoded)) || !user)
        fail(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    return json(snapshot(user), 200, {
      "Set-Cookie": createSession(request, user.id),
    });
  });
}
