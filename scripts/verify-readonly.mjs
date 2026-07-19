import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceRoots = ["app", "components", "lib"].map((entry) => path.join(root, entry));
const approvedReadModelAdapter = path.normalize("lib/read-model/sqlite-store.ts");
/** Phase-2 allowlisted bridge may spawn node scripts/ados-tools/* only (never Cursor adapters). */
const approvedCommandBridge = path.normalize("lib/commands/ados-bridge.ts");
const writerPattern = /\b(?:writeFile|appendFile|truncate|unlink|rename|rm|rmdir|mkdir)(?:Sync)?\s*\(/;
const processExecutionPattern = /\b(?:exec|execFile|spawn|fork)\s*\(/;
const prohibited = [
  /Invoke-CursorAgent\.ps1/i,
  /Launch-Cursor\.ps1/i,
];
const adapterBoundaryViolations = [
  /ADOS_(?:CONTROL_PLANE|ORCHESTRATOR)_ROOT/,
  /\borchestratorRoot\b/,
  /["'`]handoffs[\\/"'`]/i,
  /["'`]state[\\/"'`]/i,
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(fullPath)));
    if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push(fullPath);
  }

  return files;
}

const violations = [];
for (const sourceRoot of sourceRoots) {
  for (const file of await collect(sourceRoot)) {
    const source = await readFile(file, "utf8");
    const relative = path.normalize(path.relative(root, file));
    if (writerPattern.test(source) && relative !== approvedReadModelAdapter) {
      violations.push(`${relative} matched ${writerPattern}`);
    }
    if (
      processExecutionPattern.test(source) &&
      relative !== approvedReadModelAdapter &&
      relative !== approvedCommandBridge
    ) {
      violations.push(`${relative} matched ${processExecutionPattern}`);
    }
    if (/node:child_process/.test(source) && relative !== approvedCommandBridge) {
      violations.push(`${relative} matched node:child_process`);
    }
    for (const pattern of prohibited) {
      if (pattern.test(source)) violations.push(`${relative} matched ${pattern}`);
    }
    if (relative === approvedReadModelAdapter) {
      for (const pattern of adapterBoundaryViolations) {
        if (pattern.test(source)) violations.push(`${relative} crossed its app-owned data boundary via ${pattern}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Read-only source audit passed: no ADOS writers/dispatch adapters in app surfaces; SQLite cache + Phase-2/3 ados-bridge spawn are the only approved exceptions.");
