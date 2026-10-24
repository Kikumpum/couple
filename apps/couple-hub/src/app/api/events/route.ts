import { currentUser, requireUser, throttle } from "@/server/auth";
import { cloudEnabled } from "@/server/cloud-store";
import { cloudEvents } from "@/server/cloud";
import { db } from "@/server/db";
import { handle, fail } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const connections = new Map<string, number>();

// Send invalidations, never record contents. Each refresh rechecks membership and consent.
export function GET(request: Request) {
  if (cloudEnabled()) return cloudEvents(request);
  return handle(() => {
    const user = requireUser(request);
    if ((connections.get(user.id) ?? 0) >= 5)
      fail(429, "RATE_LIMITED", "Terlalu banyak koneksi aktif.");
    throttle(`events:${user.id}`, 60, 60000);
    connections.set(user.id, (connections.get(user.id) ?? 0) + 1);
    const encoder = new TextEncoder();
    let timer: ReturnType<typeof setInterval> | undefined;
    let finished = false;
    let stop = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let previous = -1;
        let beats = 0;
        stop = () => {
          if (finished) return;
          finished = true;
          const count = (connections.get(user.id) ?? 1) - 1;
          if (count > 0) connections.set(user.id, count);
          else connections.delete(user.id);
          if (timer) clearInterval(timer);
          request.signal.removeEventListener("abort", stop);
          try {
            controller.close();
          } catch {
            /* Reader already disconnected. */
          }
        };
        const tick = () => {
          if (finished) return;
          try {
            if (!currentUser(request)) {
              controller.enqueue(
                encoder.encode("event: signed-out\ndata: {}\n\n"),
              );
              stop();
              return;
            }
            const row = db()
              .prepare("SELECT version FROM user_changes WHERE userId=?")
              .get(user.id) as { version: number } | undefined;
            const version = row?.version ?? 0;
            if (previous !== version) {
              controller.enqueue(
                encoder.encode(`event: change\ndata: ${version}\n\n`),
              );
              previous = version;
            } else if (++beats % 20 === 0)
              controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            stop();
          }
        };
        controller.enqueue(encoder.encode("retry: 3000\n\n"));
        request.signal.addEventListener("abort", stop, { once: true });
        tick();
        if (!finished) timer = setInterval(tick, 1000);
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
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
