/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7f4',
          100: '#dceee6',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          navy: '#0c1e3c',
          cream: '#f8f6f3',
        },
        accent: {
          cyan: '#26d0ce',
          orange: '#f27121',
        },
        dark: {
          hero: '#0a0e1b',
          panel: '#111827',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(12, 30, 60, 0.08), 0 8px 24px rgba(12, 30, 60, 0.06)',
        'card-hover': '0 12px 40px rgba(12, 30, 60, 0.12)',
      },
    },
  },
  plugins: [],
};
