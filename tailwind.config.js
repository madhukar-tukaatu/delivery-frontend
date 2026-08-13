/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        tukaatu: {
          navy: "#0B1220",
          blue: "#2563EB",
          cyan: "#06B6D4",
          success: "#16A34A",
          warning: "#F59E0B",
          danger: "#DC2626",
          background: "#F8FAFC",
        },
      },

      boxShadow: {
        tukaatu: "0 20px 60px rgba(11, 18, 32, 0.12)",
      },

      borderRadius: {
        "4xl": "2rem",
      },
    },
  },

  plugins: [],
};