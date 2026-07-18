import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const authFile = path.join(process.cwd(), ".mission-control-auth.env");
const file = await readFile(authFile, "utf8");
const environment = { ...process.env };

for (const line of file.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const separator = trimmed.indexOf("=");
  if (separator < 1) continue;
  environment[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
}

environment.NODE_ENV = "production";
environment.MISSION_CONTROL_MODE ||= "live";
environment.MISSION_CONTROL_PERSISTENCE ||= "sqlite";
environment.MISSION_CONTROL_DATA_ROOT ||= path.join(process.cwd(), "data");
environment.APP_VERSION ||= "2.0.0";
environment.BUILD_ID ||= "v2-local-staging";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", process.env.MISSION_CONTROL_PORT || "3100"], {
  cwd: process.cwd(),
  env: environment,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
