/**
 * FBL-SEC-004: constant-time string compare for Basic-auth credentials.
 *
 * Mission Control middleware runs on the Edge runtime in Next.js 15.5, which
 * cannot import `node:crypto`. This portable Uint8Array XOR compare keeps
 * work proportional to max(length) and avoids early returns on first mismatch.
 */
export function timingSafeEqualString(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.max(leftBytes.byteLength, rightBytes.byteLength);
  let difference = leftBytes.byteLength ^ rightBytes.byteLength;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}
