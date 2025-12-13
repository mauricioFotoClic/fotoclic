/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'display': ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: '#0047FF',
        'primary-dark': '#0A1A2F',
        secondary: '#8A2BE2',
        'secondary-light': '#C13AFF',
        neutral: {
          100: '#F5F5F5',
          200: '#E5E5E5',
          800: '#1A1A1A',
          900: '#111111',
        },
      },
    },
  },
  plugins: [],
}