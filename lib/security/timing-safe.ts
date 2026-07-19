import { timingSafeEqual } from "node:crypto";

/**
 * FBL-SEC-004: compare UTF-8 strings with crypto.timingSafeEqual.
 * Length mismatches return false after a same-buffer compare to avoid a pure early return.
 */
export function timingSafeEqualString(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    timingSafeEqual(leftBytes, leftBytes);
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}
