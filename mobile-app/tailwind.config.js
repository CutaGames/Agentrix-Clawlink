/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ClawLink brand colors
        brand: {
          50: '#e8f4ff',
          100: '#d0e9ff',
          200: '#a8d4ff',
          300: '#6bb6ff',
          400: '#3b97f5',
          500: '#1a77e0',
          600: '#0d5cc4',
          700: '#0d48a0',
          800: '#113e82',
          900: '#13356b',
        },
        // Electric blue accent
        electric: {
          400: '#00d4ff',
          500: '#00b8e6',
          600: '#009dbf',
        },
        // Emerald success
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // App backgrounds
        bg: {
          primary: '#0B1220',
          secondary: '#111827',
          card: '#1a2235',
          elevated: '#1f2d42',
          input: '#162030',
          border: '#2a3a52',
        },
        // Text
        text: {
          primary: '#f0f6ff',
          secondary: '#8ba3be',
          muted: '#4d6278',
          inverse: '#0B1220',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        input: '10px',
        chip: '8px',
      },
    },
  },
  plugins: [],
};
