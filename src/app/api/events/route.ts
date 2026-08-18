import { getSessionUser } from "@/lib/auth/session";
import { subscribe, type RealtimeEvent } from "@/lib/realtime";
import { boot } from "@/lib/boot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Server-Sent Events akışı.
 * Bildirimler, düello davetleri ve düello içi güncellemeler buradan gelir.
 * Ek servis/port gerektirmez; Node süreci üzerinde çalışır.
 */
export async function GET(req: Request) {
  boot();
  const user = await getSessionUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const duelId = url.searchParams.get("duel");

  const encoder = new TextEncoder();
  let cleanup: Array<() => void> = [];
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: RealtimeEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          /* akış kapanmış */
        }
      };

      send({ type: "ping", payload: Date.now() });
      cleanup.push(subscribe(`user:${user.id}`, send));
      if (duelId) cleanup.push(subscribe(`duel:${duelId}`, send));

      interval = setInterval(() => send({ type: "ping", payload: Date.now() }), 25000);

      req.signal.addEventListener("abort", () => {
        if (interval) clearInterval(interval);
        cleanup.forEach((fn) => fn());
        cleanup = [];
        try {
          controller.close();
        } catch {
          /* zaten kapalı */
        }
      });
    },
    cancel() {
      if (interval) clearInterval(interval);
      cleanup.forEach((fn) => fn());
      cleanup = [];
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
