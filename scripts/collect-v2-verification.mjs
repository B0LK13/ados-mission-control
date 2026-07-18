import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this collector through `npm run evidence:verify`.");

const outputRoot = path.join(process.cwd(), "evidence", "deployment-v2", "verification");
await mkdir(outputRoot, { recursive: true });

const checks = [
  ["01-schema-validation", ["run", "validate:schemas"]],
  ["02-readonly-audit", ["run", "verify:readonly"]],
  ["03-lint", ["run", "lint"]],
  ["04-typecheck", ["run", "typecheck"]],
  ["05-unit-security", ["run", "test:unit"]],
  ["06-production-build", ["run", "build"]],
  ["07-browser-e2e", ["run", "test:e2e"]],
  ["08-production-audit", ["audit", "--omit=dev"]],
];

let failed = false;
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    encoding: "utf8",
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.replace(/\u001b\[[0-9;]*m/g, "");
  await writeFile(path.join(outputRoot, `${name}.log`), output, "utf8");
  const passed = !result.error && result.status === 0;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) failed = true;
}

await writeFile(
  path.join(outputRoot, "00-runtime.txt"),
  `node=${process.version}\nplatform=${process.platform}\narch=${process.arch}\ngeneratedAt=${new Date().toISOString()}\n`,
  "utf8",
);

if (failed) process.exit(1);
