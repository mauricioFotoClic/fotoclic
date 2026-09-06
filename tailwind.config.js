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
        primary: '#20C933', // Verde FotoClic (#20C933 / RGB 32, 201, 51)
        'primary-dark': '#18a82a',
        secondary: '#000000', // Preto
        'secondary-light': '#1A1A1A',
        neutral: {
          100: '#F5F5F5',
          200: '#E5E5E5',
          800: '#1A1A1A',
          900: '#000000',
        },
      },
    },
  },
  plugins: [],
}