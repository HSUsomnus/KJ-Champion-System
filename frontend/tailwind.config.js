/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#06c656",
        "primary-dark": "#05a546",
        "line-green": "#00B900",
        "background-light": "#ffffff",
        "background-dark": "#0f2317",
        "surface-light": "#f5f8f7",
        "surface-dark": "#162e21",
        "type-class": "#F1C40F",
        "type-activity": "#FF0000",
        "type-consult": "#28B463",
        "star-white": "#E0E0E0",
        "star-green": "#E8F5E9",
        "star-orange": "#FFF3E0",
        "star-red": "#FFEBEE",
        "star-purple": "#F3E5F5",
      },
      fontFamily: {
        display: ["Inter", "Noto Sans TC", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        up: "0 -4px 20px -2px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
}
