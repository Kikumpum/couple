import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        peach: { DEFAULT: "#FFDAB9", main: "#FFDAB9", light: "#FFF0E6" },
        lavender: { DEFAULT: "#E6E6FA", main: "#E6E6FA" },
        mint: { DEFAULT: "#98FF98", main: "#98FF98" },
        ink: "#1F2937",
        night: "#111827"
      },
      boxShadow: {
        glass: "0 18px 45px rgba(31, 41, 55, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
