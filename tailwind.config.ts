import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        peach: "#FFDAB9",
        lavender: "#E6E6FA",
        mint: "#98FF98",
        ink: "#21232A",
        night: "#111827"
      },
      boxShadow: {
        glass: "0 24px 70px rgba(31, 35, 45, 0.12)",
        premium: "0 24px 70px rgba(17, 24, 39, 0.08)",
        soft: "0 14px 34px rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
