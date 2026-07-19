import type { MissionSnapshot } from "@/lib/contracts";
import { etagMatches, paginateItems, parsePageParams, weakEtag, type PageResult } from "@/lib/api/pagination";
import { getSharedMissionSnapshot } from "@/lib/broker/snapshot-cache";
import { redactValue } from "@/lib/redaction";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "X-ADOS-Authority": "read-only",
};

export function missionJson(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return Response.json(redactValue(data), { status, headers: { ...headers, ...extraHeaders } });
}

/** Redacted JSON for Phase-2/3 command routes (not the read-model selector helper). */
export function missionCommandJson(
  data: unknown,
  status = 200,
  authority: "phase2-commands" | "phase3-commands" | "phase6-commands" = "phase2-commands",
): Response {
  return Response.json(redactValue(data), {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-ADOS-Authority": status >= 200 && status < 300 ? authority : "read-only",
    },
  });
}

export async function missionResponse<T>(
  selector: (snapshot: MissionSnapshot) => T | Response,
): Promise<Response> {
  try {
    const { snapshot } = await getSharedMissionSnapshot();
    const selected = selector(snapshot);
    if (selected instanceof Response) return selected;
    return missionJson(selected);
  } catch {
    return missionJson(
      { error: { code: "READ_MODEL_UNAVAILABLE", message: "The read-only state model is unavailable." } },
      503,
    );
  }
}

/**
 * Paginated list helper: `?cursor=&limit=` (default 50, max 200) + weak ETag / If-None-Match → 304.
 * Cursor is an opaque offset into the snapshot list order — see lib/api/pagination.ts.
 */
export async function missionListResponse<T>(
  request: Request,
  selectItems: (snapshot: MissionSnapshot) => readonly T[],
  buildExtra?: (snapshot: MissionSnapshot, page: PageResult<T>) => Record<string, unknown>,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const parsed = parsePageParams(url);
    if (!parsed.ok) {
      return missionJson({ error: { code: "VALIDATION_ERROR", message: parsed.message } }, 400);
    }
    const { snapshot } = await getSharedMissionSnapshot();
    const page = paginateItems(selectItems(snapshot), parsed.params);
    const extra = buildExtra?.(snapshot, page) || {};
    const body = {
      items: page.items,
      total: page.total,
      limit: page.limit,
      cursor: page.cursor,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      snapshotAt: snapshot.snapshotAt,
      ...extra,
    };
    const redacted = redactValue(body);
    const etag = weakEtag(
      snapshot.snapshotAt || "",
      String(parsed.params.offset),
      String(parsed.params.limit),
      JSON.stringify(redacted),
    );
    if (etagMatches(request.headers.get("if-none-match"), etag)) {
      return new Response(null, {
        status: 304,
        headers: {
          ...headers,
          ETag: etag,
        },
      });
    }
    return Response.json(redacted, {
      status: 200,
      headers: {
        ...headers,
        ETag: etag,
      },
    });
  } catch {
    return missionJson(
      { error: { code: "READ_MODEL_UNAVAILABLE", message: "The read-only state model is unavailable." } },
      503,
    );
  }
}
