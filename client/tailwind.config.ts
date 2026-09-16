import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
        poppins: ['"Poppins"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        royal: {
          dark: '#070B14',
          surface: '#0C1526',
          card: '#111D38',
          border: '#1C2E50',
          gold: '#F59E0B',
          'gold-l': '#FCD34D',
        },
        role: {
          raja: '#FB923C',
          mantri: '#60A5FA',
          sipahi: '#34D399',
          chor: '#EF4444',
        },
        ink: {
          DEFAULT: '#F1F5F9',
          muted: '#94A3B8',
        },
        accent: {
          purple: '#A78BFA',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
