#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseline = path.join(root, ".secrets.baseline");
if (!existsSync(baseline)) {
  console.error("Missing .secrets.baseline");
  process.exit(1);
}

const listed = spawnSync("git", ["ls-files", "-z", "--", "*.ts", "*.tsx", "*.mjs", "*.js", "*.json", "*.yml", "*.yaml"], {
  cwd: root,
  encoding: "buffer",
});
if (listed.status !== 0) {
  console.error(listed.stderr?.toString() || "git ls-files failed");
  process.exit(listed.status ?? 1);
}

const files = listed.stdout
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter((file) => file !== "package-lock.json" && !file.startsWith("ados-mission-control-update-package/ADOS-Mission-Control"));

if (!files.length) {
  console.error("No files selected for secrets scan");
  process.exit(2);
}

const result = spawnSync("detect-secrets-hook", ["--baseline", ".secrets.baseline", ...files], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  console.error("Install detect-secrets (pip/pipx) or run via pre-commit.");
  process.exit(1);
}

process.exit(result.status ?? 1);
