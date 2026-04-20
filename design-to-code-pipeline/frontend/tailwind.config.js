/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#0b1220", 900: "#111827", 800: "#1f2937" },
        accent: { DEFAULT: "#38bdf8", dim: "#0ea5e9" },
      },
    },
  },
  plugins: [],
};
