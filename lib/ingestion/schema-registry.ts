export type InputRecordKind = "ledger-event" | "approval-disposition" | "approval-consumption" | "approval-file";

export interface InputValidationWarning {
  code: "INVALID_RECORD";
  source: string;
  line?: number;
  message: string;
}

const supportedVersions = new Set(["legacy-v1", "1", "1.0", "1.0.0", "1.1", "1.1.0", "2", "2.0", "2.0.0"]);

function nonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function detectedVersion(record: Record<string, unknown>): string {
  const value = record.schemaVersion ?? record.version;
  return typeof value === "string" || typeof value === "number" ? String(value) : "legacy-v1";
}

export function validateInputRecords(
  kind: InputRecordKind,
  records: Record<string, unknown>[],
  source: string,
): { records: Record<string, unknown>[]; warnings: InputValidationWarning[] } {
  const warnings: InputValidationWarning[] = [];
  records.forEach((record, index) => {
    const version = detectedVersion(record);
    if (!supportedVersions.has(version)) {
      warnings.push({ code: "INVALID_RECORD", source, line: index + 1, message: `Unsupported ${kind} schema version.` });
    }
    if (kind === "ledger-event") {
      const legacyEventId = version.startsWith("1.") && nonEmptyString(record.eventId);
      if (typeof record.sequence !== "number" && !legacyEventId) warnings.push({ code: "INVALID_RECORD", source, line: index + 1, message: "Ledger event is missing a numeric sequence or legacy event identifier." });
      if (!nonEmptyString(record.eventType) && !nonEmptyString(record.type)) warnings.push({ code: "INVALID_RECORD", source, line: index + 1, message: "Ledger event is missing an event type." });
    } else if (!nonEmptyString(record.approvalId) && !nonEmptyString(record.id)) {
      warnings.push({ code: "INVALID_RECORD", source, line: index + 1, message: `${kind} is missing an approval identifier.` });
    }
  });
  return { records, warnings };
}
