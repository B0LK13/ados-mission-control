#!/usr/bin/env node
/**
 * Start Mission Control for Playwright.
 * Prefers the standalone server (matches Docker / next.config output: "standalone").
 * Falls back to `next start` only when standalone artifacts are missing.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = process.argv.includes("--port")
  ? process.argv[process.argv.indexOf("--port") + 1]
  : process.env.PORT || "3201";
const hostname = process.env.HOSTNAME || "127.0.0.1";

const standaloneServer = path.join(root, ".next", "standalone", "server.js");
const standaloneStatic = path.join(root, ".next", "standalone", ".next", "static");
const buildStatic = path.join(root, ".next", "static");

function ensureStandaloneStatic() {
  if (!fs.existsSync(buildStatic)) return;
  fs.mkdirSync(path.dirname(standaloneStatic), { recursive: true });
  fs.cpSync(buildStatic, standaloneStatic, { recursive: true, force: true });
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  PORT: String(port),
  HOSTNAME: hostname,
};

let child;
if (fs.existsSync(standaloneServer)) {
  ensureStandaloneStatic();
  child = spawn(process.execPath, [standaloneServer], {
    cwd: path.join(root, ".next", "standalone"),
    env,
    stdio: "inherit",
  });
} else {
  console.warn("[start-e2e-server] standalone missing; falling back to next start");
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  child = spawn(process.execPath, [nextBin, "start", "--hostname", hostname, "--port", String(port)], {
    cwd: root,
    env,
    stdio: "inherit",
  });
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
