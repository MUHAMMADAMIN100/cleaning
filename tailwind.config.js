/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Брендовая палитра «Архыдея клининг»
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
        accent: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(59, 130, 246, 0.45)',
        card: '0 10px 40px -12px rgba(10, 20, 64, 0.25)',
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(135deg, #060d2b 0%, #0e1b54 50%, #16297a 100%)',
        'hero-radial': 'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.25), transparent 50%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
