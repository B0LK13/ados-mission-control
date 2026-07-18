import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.env.MISSION_CONTROL_EVIDENCE_DIR || path.join(process.cwd(), "evidence", "deployment-v2");
const manifestName = "SHA256SUMS.txt";

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(candidate));
    else if (entry.isFile() && entry.name !== manifestName) files.push(candidate);
  }
  return files;
}

const files = (await collect(root)).sort((left, right) => left.localeCompare(right));
const lines = [];
for (const file of files) {
  const digest = createHash("sha256").update(await readFile(file)).digest("hex");
  lines.push(`${digest}  ${path.relative(root, file).replaceAll("\\", "/")}`);
}
await writeFile(path.join(root, manifestName), `${lines.join("\n")}\n`, "utf8");
console.log(`Hashed ${files.length} evidence files.`);
