/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkNavy: '#06113C',
        accentCyan: '#43b0c4',
        slateBg: '#f8fafc',
      },
    },
  },
  plugins: [],
}