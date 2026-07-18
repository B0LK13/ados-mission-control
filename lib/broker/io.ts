import { access, open, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface ParseWarning {
  code: "MALFORMED_JSON" | "INVALID_RECORD" | "DUPLICATE_SEQUENCE" | "SOURCE_UNAVAILABLE";
  source: string;
  line?: number;
  message: string;
}

export interface JsonLinesResult {
  records: Record<string, unknown>[];
  warnings: ParseWarning[];
}

export function resolveWithinRoot(root: string, ...segments: string[]): string {
  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("PATH_OUTSIDE_CONFIGURED_ROOT");
  }
  return candidate;
}

export async function exists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T = unknown>(candidate: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(candidate, "utf8")) as T;
  } catch {
    return null;
  }
}

export function parseJsonLines(content: string, source = "jsonl"): JsonLinesResult {
  const records: Record<string, unknown>[] = [];
  const warnings: ParseWarning[] = [];
  const sequences = new Set<number>();

  content.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        warnings.push({
          code: "INVALID_RECORD",
          source,
          line: index + 1,
          message: "JSONL entry is not an object.",
        });
        return;
      }
      const record = parsed as Record<string, unknown>;
      if (typeof record.sequence === "number") {
        if (sequences.has(record.sequence)) {
          warnings.push({
            code: "DUPLICATE_SEQUENCE",
            source,
            line: index + 1,
            message: `Duplicate ledger sequence ${record.sequence}.`,
          });
        }
        sequences.add(record.sequence);
      }
      records.push(record);
    } catch {
      warnings.push({
        code: "MALFORMED_JSON",
        source,
        line: index + 1,
        message: "Malformed JSONL entry was skipped.",
      });
    }
  });

  return { records, warnings };
}

export async function readJsonLines(
  candidate: string,
  limit: number,
  maxBytes = 4_194_304,
): Promise<JsonLinesResult> {
  try {
    const fileStat = await stat(candidate);
    const bytesToRead = Math.min(fileStat.size, maxBytes);
    const start = Math.max(0, fileStat.size - bytesToRead);
    const handle = await open(candidate, "r");
    const buffer = Buffer.alloc(bytesToRead);

    try {
      await handle.read(buffer, 0, bytesToRead, start);
    } finally {
      await handle.close();
    }

    const text = buffer.toString("utf8");
    const completeText = start > 0 ? text.slice(Math.max(0, text.indexOf("\n") + 1)) : text;
    const parsed = parseJsonLines(completeText, path.basename(candidate));
    return { records: parsed.records.slice(-limit), warnings: parsed.warnings };
  } catch {
    return {
      records: [],
      warnings: [{
        code: "SOURCE_UNAVAILABLE",
        source: path.basename(candidate),
        message: "Configured source file is unavailable.",
      }],
    };
  }
}

export async function readJsonLinesTail(
  candidate: string,
  limit: number,
  maxBytes = 4_194_304,
): Promise<Record<string, unknown>[]> {
  return (await readJsonLines(candidate, limit, maxBytes)).records;
}

export async function listJsonFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
      .map((entry) => path.join(directory, entry.name))
      .sort();
  } catch {
    return [];
  }
}

export interface FileMetadata {
  path: string;
  size: number;
  modifiedAt: string;
}

export async function listFileMetadata(
  directory: string,
  limit = 40,
  maxDepth = 3,
): Promise<FileMetadata[]> {
  const files: FileMetadata[] = [];

  async function visit(current: string, depth: number): Promise<void> {
    if (files.length >= limit || depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= limit) return;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath, depth + 1);
      } else if (entry.isFile()) {
        try {
          const fileStat = await stat(fullPath);
          files.push({ path: fullPath, size: fileStat.size, modifiedAt: fileStat.mtime.toISOString() });
        } catch {
          continue;
        }
      }
    }
  }

  await visit(directory, 0);
  return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}
