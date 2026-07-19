"use client";

import { useEffect, useState } from "react";
import { formatRemaining } from "@/lib/lease-expiry";

/** Client countdown for lease/approval expiry. UNAVAILABLE when expiresAt missing/malformed. */
export function LeaseExpiryCountdown({ expiresAt }: { expiresAt?: string | null }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) {
    return <span className="lease-expiry unavailable">Expiry UNAVAILABLE</span>;
  }
  const remaining = formatRemaining(expiresAt, nowMs);
  if (!remaining) {
    return <span className="lease-expiry unavailable">Expiry UNAVAILABLE</span>;
  }
  return (
    <span className={`lease-expiry ${remaining.overdue ? "overdue" : "ok"}`} title={expiresAt}>
      {remaining.text}
    </span>
  );
}
