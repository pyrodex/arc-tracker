/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arc: {
          bg:      '#080c14',
          panel:   '#0d1520',
          card:    '#111a2c',
          border:  '#1e2d47',
          hover:   '#162035',
          accent:  '#38bdf8',
          learned: '#22c55e',
          extra:   '#f59e0b',
          danger:  '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
