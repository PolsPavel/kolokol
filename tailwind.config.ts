// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        heading: ["var(--font-playfair)", "serif"],
      },
      colors: {
        // ���� ������� (�����-������)
        brand: {
          black: "#0a0a0a",
          dark: "#1f1f1f",
          gray: "#2a2a2a",
          yellow: "#FACC15",
          yellowHover: "#EAB308",
        }
      },
    },
  },
  plugins: [],
};
export default config;