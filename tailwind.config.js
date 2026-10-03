/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEF0F2",
        ink: "#1B2430",
        night: "#0E141C",
        muted: "#5B6675",
        line: "#CDD3DA",
        amber: "#E0A030",
        heat: "#E2562F",
        blue: "#2B6CB0",
      },
      fontFamily: {
        serif: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      keyframes: {
        glow: { "0%": { boxShadow: "0 0 0 0 currentColor" }, "70%,100%": { boxShadow: "0 0 0 9px transparent" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
      },
      animation: {
        glow: "glow 2.2s ease-out infinite",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
