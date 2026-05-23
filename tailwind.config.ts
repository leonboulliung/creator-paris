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
      },
      animation: {
        pulseRing: "pulseRing 1.4s ease-out infinite",
        ticker: "ticker 60s linear infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        fadeIn: "fadeIn .35s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
