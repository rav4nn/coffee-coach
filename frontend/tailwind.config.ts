import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f6f0e7",
        latte: "#e8dccb",
        mocha: "#6f4e37",
        espresso: "#3a2a21",
        steam: "#fffaf3",
        charcoal: "#2d2926",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 12px 30px rgba(58, 42, 33, 0.08)",
      },
      maxWidth: {
        phone: "30rem",
      },
    },
  },
  plugins: [],
};

export default config;
