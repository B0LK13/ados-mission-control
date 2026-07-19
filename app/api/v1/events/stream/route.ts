import { getMissionControlConfig } from "@/lib/config";
import { getSharedMissionSnapshot } from "@/lib/broker/snapshot-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const { refreshMs } = getMissionControlConfig();
  let closed = false;
  let snapshotTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  // Last-Event-ID: acknowledged for reconnect observability, but resume is full-snapshot only.
  // True event-delta replay is wont-fix for Phase-1 MVP (see ARCHITECTURE.md) — never invent gaps.
  const lastEventId = request.headers.get("last-event-id")?.trim() || "";

  const close = () => {
    if (closed) return;
    closed = true;
    if (snapshotTimer) clearInterval(snapshotTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    try {
      streamController?.close();
    } catch {
      return;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamController = controller;
      if (lastEventId) {
        controller.enqueue(encoder.encode(`: resume after ${lastEventId}\n\n`));
      }

      const sendSnapshot = async () => {
        if (closed) return;
        try {
          const { snapshot, sequence } = await getSharedMissionSnapshot(refreshMs);
          controller.enqueue(
            encoder.encode(
              `id: ${sequence}\nevent: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Read model unavailable.";
          controller.enqueue(
            encoder.encode(`event: broker-error\ndata: ${JSON.stringify({ message })}\n\n`),
          );
        }
      };

      await sendSnapshot();
      snapshotTimer = setInterval(sendSnapshot, refreshMs);
      heartbeatTimer = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, 15_000);
      request.signal.addEventListener("abort", close, { once: true });
    },
    cancel: close,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-ADOS-Authority": "read-only",
    },
  });
}
