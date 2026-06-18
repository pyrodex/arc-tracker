/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arc: {
          bg:      'rgb(var(--arc-bg)      / <alpha-value>)',
          panel:   'rgb(var(--arc-panel)   / <alpha-value>)',
          card:    'rgb(var(--arc-card)    / <alpha-value>)',
          border:  'rgb(var(--arc-border)  / <alpha-value>)',
          hover:   'rgb(var(--arc-hover)   / <alpha-value>)',
          accent:  'rgb(var(--arc-accent)  / <alpha-value>)',
          learned: 'rgb(var(--arc-learned) / <alpha-value>)',
          extra:   'rgb(var(--arc-extra)   / <alpha-value>)',
          danger:  'rgb(var(--arc-danger)  / <alpha-value>)',
          text:    'rgb(var(--arc-text)    / <alpha-value>)',
          muted:   'rgb(var(--arc-text-muted) / <alpha-value>)',
          dim:     'rgb(var(--arc-text-dim)   / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
