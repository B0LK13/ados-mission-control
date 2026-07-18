import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.MISSION_CONTROL_URL || "http://127.0.0.1:3100";
const outputRoot = path.join(process.cwd(), "evidence", "deployment-v2");
await mkdir(outputRoot, { recursive: true });

const values = {};
for (const line of (await readFile(path.join(process.cwd(), ".mission-control-auth.env"), "utf8")).split(/\r?\n/)) {
  const separator = line.indexOf("=");
  if (separator > 0) values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
}
if (!values.MISSION_CONTROL_AUTH_USER || !values.MISSION_CONTROL_AUTH_SECRET) throw new Error("STAGING_CREDENTIALS_UNAVAILABLE");
const authorization = `Basic ${Buffer.from(`${values.MISSION_CONTROL_AUTH_USER}:${values.MISSION_CONTROL_AUTH_SECRET}`).toString("base64")}`;

const healthResponse = await fetch(`${baseUrl}/api/health`);
const health = await healthResponse.json();
const anonymousResponse = await fetch(`${baseUrl}/api/v1/snapshot`);
const authenticatedResponse = await fetch(`${baseUrl}/api/v1/snapshot`, { headers: { authorization } });
const authenticatedSnapshot = await authenticatedResponse.json();
const mutationResponse = await fetch(`${baseUrl}/api/v1/approvals/probe`, { method: "POST" });
const cache = await stat(path.join(process.cwd(), "data", "mission-control-v2.sqlite"));

await writeFile(path.join(outputRoot, "HEALTH.json"), `${JSON.stringify(health, null, 2)}\n`, "utf8");
await writeFile(path.join(outputRoot, "AUTH-AND-READONLY.txt"), [
  `anonymousProtectedStatus=${anonymousResponse.status}`,
  `anonymousChallenge=${anonymousResponse.headers.has("www-authenticate")}`,
  `authenticatedProtectedStatus=${authenticatedResponse.status}`,
  `unsafeMutationStatus=${mutationResponse.status}`,
  `unsafeMutationAllow=${mutationResponse.headers.get("allow") || ""}`,
  "credentialMaterialRecorded=false",
  "",
].join("\n"), "utf8");
await writeFile(path.join(outputRoot, "READ-MODEL.json"), `${JSON.stringify({
  schemaVersion: authenticatedSnapshot.schemaVersion,
  sourceMode: authenticatedSnapshot.source?.mode,
  sourceReachable: authenticatedSnapshot.source?.reachable,
  sourceStale: authenticatedSnapshot.source?.stale,
  readModel: authenticatedSnapshot.readModel,
  cacheFile: "data/mission-control-v2.sqlite",
  cacheBytes: cache.size,
}, null, 2)}\n`, "utf8");

const passed = healthResponse.status === 200
  && health.version === "2.0.0"
  && anonymousResponse.status === 401
  && authenticatedResponse.status === 200
  && mutationResponse.status === 405
  && authenticatedSnapshot.readModel?.backend === "SQLITE"
  && cache.size > 0;

console.log(`V2 staging verification ${passed ? "passed" : "failed"}; credentials were not printed or recorded.`);
if (!passed) process.exit(1);
