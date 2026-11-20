import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15130F',
        muted: '#6B6358',
        line: '#E6E0D6',
        paper: '#FBF9F5',
        card: '#FFFFFF',
        accent: '#C2410C',
        'accent-soft': '#FFF1E8',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
    },
  },
  plugins: [],
} satisfies Config;
