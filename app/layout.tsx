import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import "./globals.css";

// Editorial appearance for every Clerk-rendered surface (modal, hosted pages,
// UserButton). Keeps the B&W ink-on-paper aesthetic with our typography.
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
    spacingUnit: "0.95rem",
  },
  elements: {
    rootBox: "font-sans",
    card: "border border-[#0a0a0a] rounded-none shadow-none bg-[#fafafa]",
    cardBox: "border border-[#0a0a0a] rounded-none shadow-none",
    headerTitle: "font-black tracking-tight text-[#0a0a0a] text-[28px]",
    headerSubtitle: "font-mono text-[11px] tracking-widest uppercase opacity-70",
    socialButtonsBlockButton:
      "border border-[#0a0a0a] rounded-none font-mono text-[11px] tracking-widest uppercase hover:bg-[#0a0a0a] hover:text-[#fafafa]",
    formFieldLabel:
      "font-mono text-[10px] tracking-widest uppercase opacity-70 text-[#0a0a0a]",
    formFieldInput:
      "border border-[#0a0a0a] rounded-none focus:ring-0 focus:border-[#0a0a0a] font-mono text-[13px] bg-white",
    formButtonPrimary:
      "bg-[#0a0a0a] text-[#fafafa] rounded-none font-mono text-[11px] tracking-widest uppercase border border-[#0a0a0a] hover:bg-[#1a1a1a] shadow-none",
    formButtonReset:
      "rounded-none font-mono text-[11px] tracking-widest uppercase text-[#0a0a0a]",
    footer: "bg-transparent border-t border-[#e5e5e5]",
    footerAction: "font-mono text-[11px] tracking-widest uppercase",
    footerActionLink: "text-[#0a0a0a] underline underline-offset-2 hover:no-underline",
    identityPreview: "border border-[#0a0a0a] rounded-none",
    formResendCodeLink: "text-[#0a0a0a] font-mono text-[11px] tracking-widest uppercase",
    otpCodeFieldInput: "border-[#0a0a0a] rounded-none focus:ring-0",
    dividerLine: "bg-[#e5e5e5]",
    dividerText: "font-mono text-[10px] tracking-widest uppercase opacity-60",
    userButtonPopoverCard: "border border-[#0a0a0a] rounded-none shadow-xl",
    userButtonPopoverActionButton: "rounded-none font-mono text-[11px] tracking-widest uppercase",
    userPreviewMainIdentifier: "font-sans font-bold",
    badge: "rounded-none font-mono uppercase tracking-widest",
    modalBackdrop: "bg-[#0a0a0a]/70",
    modalContent: "rounded-none",
  },
  layout: {
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
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