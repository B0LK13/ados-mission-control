"use client";

import { useState } from "react";

export function CopyIdButton({ value, label = "Copy ID" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" className="copy-id-button" onClick={copy} aria-label={`${label}: ${value}`} title={value}>
      {copied ? "Copied" : label}
    </button>
  );
}
