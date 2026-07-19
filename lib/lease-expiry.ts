/** Pure lease/approval expiry formatting. Never invents values when parse fails. */
export function formatRemaining(expiresAt: string, nowMs: number): { text: string; overdue: boolean } | null {
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs)) return null;
  const delta = expiresMs - nowMs;
  const overdue = delta < 0;
  const abs = Math.abs(delta);
  const seconds = Math.floor(abs / 1000);
  if (seconds < 60) return { text: overdue ? `expired ${seconds}s ago` : `${seconds}s remaining`, overdue };
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return { text: overdue ? `expired ${minutes}m ago` : `${minutes}m remaining`, overdue };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { text: overdue ? `expired ${hours}h ago` : `${hours}h remaining`, overdue };
  const days = Math.floor(hours / 24);
  return { text: overdue ? `expired ${days}d ago` : `${days}d remaining`, overdue };
}
