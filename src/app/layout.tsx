import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVForge — Shape your next chapter",
  description: "Create a CV, edit your details, save drafts in this browser, and export a standard template as PDF.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#f8f8f5" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
