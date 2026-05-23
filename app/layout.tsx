import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";

// Editorial appearance for every Clerk-rendered surface (modal, hosted pages,
// UserButton). Conservative — only `variables`, which Clerk applies via CSS
// custom properties and can't error on. Per-element class overrides removed
// because unknown element keys can crash some Clerk component versions.
const clerkAppearance = {
  variables: {
    colorPrimary: "#0a0a0a",
    colorText: "#0a0a0a",
    colorTextSecondary: "#5a5a5a",
    colorBackground: "#fafafa",
    colorInputBackground: "#ffffff",
    colorInputText: "#0a0a0a",
    colorDanger: "#7a1f1f",
    colorSuccess: "#225f3a",
    colorNeutral: "#0a0a0a",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: "13px",
    borderRadius: "0px",
  },
};

export const metadata: Metadata = {
  title: "Creator.Paris — what's your one thing this week?",
  description: "A living city layer. One card per person. Paris.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <ClerkProvider appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}