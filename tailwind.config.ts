import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // The seven the product already shipped with.
        ink: '#15130F',
        muted: '#6B6358',
        line: '#E6E0D6',
        paper: '#FBF9F5',
        card: '#FFFFFF',
        accent: '#C2410C',
        'accent-soft': '#FFF1E8',
        // Added by the design handoff.
        'ghost-line': '#D2CABD',
        'ghost-fill': '#EDE8DF',
        faint: '#A39A8D',
        placeholder: '#C4BCB0',
        success: '#15803D',
        'live-dot': '#4ADE80',
        'warn-on-dark': '#FB923C',
        'drawer-cell': '#1F1C17',
      },
      fontFamily: {
        // Geist for body, Bricolage Grotesque for display. Noto Sans
        // Devanagari stays in the stack: a lot of generated copy is
        // Hinglish and drops into Devanagari mid-sentence.
        sans: ['var(--font-sans)', 'var(--font-deva)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-deva)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
        card: '24px',
        dock: '22px',
        sheet: '28px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(.9)' },
          to: { opacity: '1', transform: 'none' },
        },
        'ghost-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.4' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease both',
        pop: 'pop .4s ease both',
        'ghost-pulse': 'ghost-pulse 1.2s ease-in-out infinite',
        'sheet-in': 'sheet-in .3s cubic-bezier(.3,.7,.2,1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
