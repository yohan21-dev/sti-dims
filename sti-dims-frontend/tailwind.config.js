/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Sora"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        navy: {
          950: '#07091A',
          900: '#0C1029',
          850: '#0F1535',
          800: '#131B42',
          700: '#1B2550',
          600: '#243060',
        },
        gold: {
          300: '#FCD475',
          400: '#F9C23A',
          500: '#F0A800',
          600: '#D08E00',
        },
        slate: {
          850: '#1B2235',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glow-gold': '0 0 20px rgba(240, 168, 0, 0.25)',
      },
    },
  },
  plugins: [],
}