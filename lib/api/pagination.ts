import { createHash } from "node:crypto";

/** Default page size for list endpoints (`?limit=`). */
export const DEFAULT_PAGE_LIMIT = 50;
/** Hard cap — larger values are clamped, never rejected. */
export const MAX_PAGE_LIMIT = 200;

export type PageParams = {
  /** Zero-based offset into the stable snapshot list order. */
  offset: number;
  limit: number;
};

export type PageResult<T> = {
  items: T[];
  total: number;
  limit: number;
  /** Opaque cursor for the current page start (null on first page). */
  cursor: string | null;
  /** Opaque cursor for the next page (null when no more items). */
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Stable cursor semantics:
 * - Cursor is base64url(JSON `{ "o": <non-negative integer offset> }`).
 * - Offset applies to the snapshot's existing list order (no re-sort in the pager).
 * - Omitting cursor means offset 0. Invalid cursors are validation errors.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

export function parsePageParams(url: URL): { ok: true; params: PageParams } | { ok: false; message: string } {
  const limitRaw = url.searchParams.get("limit");
  const cursorRaw = url.searchParams.get("cursor");
  let limit = DEFAULT_PAGE_LIMIT;
  if (limitRaw != null && limitRaw !== "") {
    const parsed = Number(limitRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { ok: false, message: "limit must be a positive integer." };
    }
    limit = Math.min(parsed, MAX_PAGE_LIMIT);
  }
  let offset = 0;
  if (cursorRaw != null && cursorRaw !== "") {
    try {
      const decoded = JSON.parse(Buffer.from(cursorRaw, "base64url").toString("utf8")) as { o?: unknown };
      if (typeof decoded.o !== "number" || !Number.isInteger(decoded.o) || decoded.o < 0) {
        return { ok: false, message: "cursor is invalid." };
      }
      offset = decoded.o;
    } catch {
      return { ok: false, message: "cursor is invalid." };
    }
  }
  return { ok: true, params: { offset, limit } };
}

export function paginateItems<T>(items: readonly T[], params: PageParams): PageResult<T> {
  const total = items.length;
  const slice = items.slice(params.offset, params.offset + params.limit) as T[];
  const nextOffset = params.offset + slice.length;
  const hasMore = nextOffset < total;
  return {
    items: slice,
    total,
    limit: params.limit,
    cursor: params.offset > 0 ? encodeCursor(params.offset) : null,
    nextCursor: hasMore ? encodeCursor(nextOffset) : null,
    hasMore,
  };
}

export function weakEtag(...parts: string[]): string {
  const digest = createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 32);
  return `W/"${digest}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const tokens = ifNoneMatch.split(",").map((part) => part.trim()).filter(Boolean);
  return tokens.includes("*") || tokens.includes(etag);
}
