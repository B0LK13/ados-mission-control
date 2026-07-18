import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADOS Mission Control · The Black Agency Command Deck",
  description: "Read-only operational cockpit for the Agent Development OS control plane.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070a08",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
