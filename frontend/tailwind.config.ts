import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#1b130b",
        latte: "#2a1d11",
        mocha: "#f49d25",
        espresso: "#f6efe4",
        steam: "#2f210f",
        charcoal: "#cbbba9",
        primary: "#f49d25",
        "background-light": "#fdf8f3",
        "background-dark": "#221a10",
      },
      fontFamily: {
        display: ["Work Sans", "sans-serif"],
        serif: ["Work Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Work Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        card: "0 14px 34px rgba(0, 0, 0, 0.35)",
      },
      maxWidth: {
        phone: "30rem",
      },
    },
  },
  plugins: [],
};

export default config;
