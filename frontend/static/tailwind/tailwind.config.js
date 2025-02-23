/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./html/**/*.{html,js,css}",
    "./project/**/*.{html,js,css}",
  ],
  theme: {
    extend: {
      fontFamily: {
        oswald: ["Oswald", "sans-serif"],
        anton: ["Anton", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
