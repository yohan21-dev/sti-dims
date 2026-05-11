/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Poppins"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        sti: {
          blue:    '#0D47A1',
          'blue-dark': '#0A3880',
          'blue-mid': '#1565C0',
          'blue-light': '#1976D2',
          'blue-pale': '#E3F2FD',
          yellow:  '#FDD835',
          'yellow-dark': '#F9A825',
          'yellow-light': '#FFF9C4',
          'yellow-mid': '#FFC107',
        },
      },
      animation: {
        'fade-in':       'fadeIn 0.25s ease-out',
        'slide-up':      'slideUp 0.35s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'modal-in':      'modalIn 0.25s ease-out',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        modalIn:      { from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(13,71,161,0.08), 0 4px 12px rgba(13,71,161,0.06)',
        'card-lg':'0 4px 16px rgba(13,71,161,0.10), 0 8px 32px rgba(13,71,161,0.06)',
        'sidebar':'4px 0 24px rgba(13,71,161,0.12)',
        'btn':    '0 2px 8px rgba(13,71,161,0.25)',
        'modal':  '0 8px 48px rgba(13,71,161,0.18)',
      },
    },
  },
  plugins: [],
}