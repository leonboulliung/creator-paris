import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"],
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#fafafa",
        rule: "#e5e5e5",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.9" },
          "100%": { transform: "scale(3.2)", opacity: "0" },
        },
        ticker: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        twinkle: {
          "0%,100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // A signal landing on an idea: a single warm pop.
        signalPop: {
          "0%": { transform: "scale(0.4)", opacity: "0" },
          "60%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // The transform CTA on a resonant idea — a slow, inviting breath.
        breathe: {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.015)" },
        },
        // Idea entrance: rises like a thought surfacing.
        rise: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.4s ease-out infinite",
        ticker: "ticker 60s linear infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        fadeIn: "fadeIn .35s ease-out both",
        signalPop: "signalPop .45s cubic-bezier(0.34,1.56,0.64,1) both",
        breathe: "breathe 3.6s ease-in-out infinite",
        rise: "rise .4s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
