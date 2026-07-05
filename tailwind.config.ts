import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07060B",
        surface: "#120F1A",
        surface2: "#1A1622",
        violet: {
          electric: "#B355FF",
          deep: "#5B1FB8",
          soft: "#D9AFFF",
        },
        ivory: "#F3EEF9",
        signal: "#FFB64D",
      },
      fontFamily: {
        display: ["var(--font-anton)"],
        body: ["var(--font-inter)"],
        mono: ["var(--font-jbmono)"],
      },
      clipPath: {
        tag: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(179, 85, 255, 0.35)",
        "glow-sm": "0 0 16px rgba(179, 85, 255, 0.45)",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "42%": { opacity: "1" },
          "43%": { opacity: "0.4" },
          "44%": { opacity: "1" },
          "88%": { opacity: "1" },
          "89%": { opacity: "0.5" },
          "90%": { opacity: "1" },
        },
        "rise-fade": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        flicker: "flicker 5s infinite",
        "rise-fade": "rise-fade 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
}
export default config
