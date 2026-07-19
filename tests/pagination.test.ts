import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  encodeCursor,
  etagMatches,
  paginateItems,
  parsePageParams,
  weakEtag,
} from "../lib/api/pagination";
import { missionListResponse } from "../lib/http";

test("parsePageParams defaults limit to 50 and clamps at 200", () => {
  const defaults = parsePageParams(new URL("http://localhost/api/v1/agents"));
  assert.equal(defaults.ok, true);
  if (!defaults.ok) return;
  assert.equal(defaults.params.limit, DEFAULT_PAGE_LIMIT);
  assert.equal(defaults.params.offset, 0);

  const clamped = parsePageParams(new URL("http://localhost/api/v1/agents?limit=999"));
  assert.equal(clamped.ok, true);
  if (!clamped.ok) return;
  assert.equal(clamped.params.limit, MAX_PAGE_LIMIT);

  const bad = parsePageParams(new URL("http://localhost/api/v1/agents?limit=0"));
  assert.equal(bad.ok, false);
});

test("cursor encodes stable offsets and paginateItems never invents rows", () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ id: `item-${index}` }));
  const page = paginateItems(items, { offset: 2, limit: 2 });
  assert.deepEqual(page.items.map((item) => item.id), ["item-2", "item-3"]);
  assert.equal(page.total, 5);
  assert.equal(page.hasMore, true);
  assert.equal(page.nextCursor, encodeCursor(4));

  const last = paginateItems(items, { offset: 4, limit: 2 });
  assert.equal(last.hasMore, false);
  assert.equal(last.nextCursor, null);

  const decoded = parsePageParams(new URL(`http://localhost/x?cursor=${encodeCursor(2)}&limit=2`));
  assert.equal(decoded.ok, true);
  if (!decoded.ok) return;
  assert.equal(decoded.params.offset, 2);
});

test("weak ETag matching supports If-None-Match", () => {
  const tag = weakEtag("a", "b");
  assert.match(tag, /^W\/"/);
  assert.equal(etagMatches(tag, tag), true);
  assert.equal(etagMatches(`W/"other", ${tag}`, tag), true);
  assert.equal(etagMatches(null, tag), false);
});

test("missionListResponse returns 304 when If-None-Match matches", async () => {
  process.env.MISSION_CONTROL_MODE = "fixture";
  const first = await missionListResponse(
    new Request("http://localhost/api/v1/agents?limit=2"),
    (snapshot) => snapshot.agents,
  );
  assert.equal(first.status, 200);
  const etag = first.headers.get("etag");
  assert.ok(etag);
  const body = await first.json();
  assert.ok(Array.isArray(body.items));
  assert.equal(typeof body.total, "number");
  assert.equal(body.limit, 2);

  const second = await missionListResponse(
    new Request("http://localhost/api/v1/agents?limit=2", { headers: { "if-none-match": etag! } }),
    (snapshot) => snapshot.agents,
  );
  assert.equal(second.status, 304);
  assert.equal(second.headers.get("etag"), etag);
});
