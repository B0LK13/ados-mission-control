import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const target = path.join(process.cwd(), ".mission-control-auth.env");
const username = process.env.MISSION_CONTROL_AUTH_USER?.trim() || "owner";
const secret = randomBytes(32).toString("base64url");
const content = [
  "MISSION_CONTROL_AUTH_MODE=basic",
  `MISSION_CONTROL_AUTH_USER=${username}`,
  `MISSION_CONTROL_AUTH_SECRET=${secret}`,
  "",
].join("\n");

try {
  await writeFile(target, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  console.log(`Created ${target}. The credential value was not printed.`);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
    console.log(`${target} already exists; it was not overwritten.`);
  } else {
    throw error;
  }
}
