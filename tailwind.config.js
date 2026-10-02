/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEF0F2",
        ink: "#1B2430",
        muted: "#5B6675",
        line: "#CDD3DA",
        amber: "#E0A030",
        blue: "#2B6CB0",
      },
    },
  },
  plugins: [],
};
