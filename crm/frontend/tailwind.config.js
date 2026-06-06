/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2fb',
          100: '#d4ddf5',
          200: '#a9bbeb',
          300: '#7e98e0',
          400: '#5376d6',
          500: '#2e54c4',
          600: '#1f3a9e',
          700: '#16297a',
          800: '#0e1b54',
          900: '#0a1440',
          950: '#060d2b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 24px -10px rgba(10, 20, 64, 0.18)',
      },
    },
  },
  plugins: [],
};
