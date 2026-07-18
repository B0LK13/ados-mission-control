import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const schemaRoot = path.join(root, "schemas");
async function collectSchemaFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSchemaFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(target);
  }
  return files;
}

const schemaFiles = await collectSchemaFiles(schemaRoot);
const schemas = await Promise.all(
  schemaFiles.map(async (filePath) => ({
    file: path.relative(schemaRoot, filePath).replaceAll("\\", "/"),
    schema: JSON.parse(await readFile(filePath, "utf8")),
  })),
);

const ajv = new Ajv2020({ allErrors: true, strict: false });
for (const { file, schema } of schemas) {
  ajv.addSchema(schema, file);
}

const snapshot = JSON.parse(
  await readFile(path.join(root, "examples", "sample-home-snapshot.json"), "utf8"),
);
const validate = ajv.getSchema("https://ados.local/schemas/mission-control-snapshot.schema.json");

if (!validate) {
  throw new Error("Mission snapshot schema was not registered.");
}

if (!validate(snapshot)) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

console.log(`Validated the V2 sample snapshot and registered ${schemaFiles.length} schemas.`);
