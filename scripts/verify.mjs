import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
const checks = [
  "validate:schemas",
  "verify:readonly",
  "lint",
  "typecheck",
  "test",
  "build",
];

for (const check of checks) {
  if (!npmCli) {
    throw new Error("npm_execpath is unavailable; run this script through `npm run verify`.");
  }

  const result = spawnSync(process.execPath, [npmCli, "run", check], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
