import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f0f5f4",
          100: "#d9e8e4",
          200: "#b3d1ca",
          300: "#82b3a8",
          400: "#5a9486",
          500: "#3d7a6c",
          600: "#2f6256",
          700: "#274f46",
          800: "#213f39",
          900: "#1b342f",
        },
      },
      width: {
        sidebar: "var(--sidebar-width)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
