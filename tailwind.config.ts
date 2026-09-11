import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Nirbana United EFC brand palette — pulled from the club crest
        ink: {
          950: '#0a0806',
          900: '#120d0a',
          850: '#181310',
          800: '#211a15',
          700: '#2c231d',
          600: '#3a2f26',
        },
        gold: {
          50: '#fbf4e4',
          100: '#f5e6c2',
          200: '#eccf8c',
          300: '#e2b75a',
          400: '#d4a339',
          500: '#c3922c',
          600: '#a67a22',
          700: '#846019',
          800: '#5c4211',
          900: '#3a2a0a',
        },
        signal: {
          teal: '#2be3c4',
          green: '#3ddc84',
          red: '#ef4b5f',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      backgroundImage: {
        'radial-fade':
          'radial-gradient(circle at 50% 0%, rgba(212,163,57,0.14), transparent 60%)',
        'noise-card':
          'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,163,57,0.35), 0 8px 30px -8px rgba(212,163,57,0.25)',
        card: '0 10px 30px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        pulseglow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseglow: 'pulseglow 2.4s ease-in-out infinite',
        rise: 'rise 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
