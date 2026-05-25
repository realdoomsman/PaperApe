/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Special Elite"', '"Courier Prime"', '"Courier New"', 'monospace'],
        mono: ['"Courier Prime"', '"Courier New"', 'monospace'],
      },
      colors: {
        pa: {
          paper:    '#e8dfc8',
          parchment:'#d4c8a8',
          ink:      '#1a1207',
          muted:    '#6b5d45',
          faded:    '#9a8b6e',
          tan:      '#b8a97e',
          tape:     'rgba(220,210,170,0.55)',
          green:    '#2d6b3f',
          red:      '#8b2020',
          gold:     '#8b6914',
          blue:     '#2c5f8a',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease',
        'pulse-dot': 'pulseDot 1s infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-4px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
