#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testsDir = path.join(root, "tests");
const files = fs
  .readdirSync(testsDir)
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => path.join("tests", f))
  .sort();

if (!files.length) {
  console.error("No test files found");
  process.exit(2);
}

const r = spawnSync("npx", ["tsx", "--test", ...files], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
