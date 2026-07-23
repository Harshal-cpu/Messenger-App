/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0F1B1E',
          bgLight: '#F7F5F2',
          surface: '#16262A',
          surfaceLight: '#FFFFFF',
          surfaceAlt: '#1E3237',
          border: '#25393E',
          borderLight: '#E7E2D9',
        },
        accent: {
          DEFAULT: '#F2A65A',
          dark: '#D98A3D',
        },
        bubble: {
          sent: '#3E7C74',
          sentDark: '#2E5F58',
        },
        ink: {
          DEFAULT: '#EDEAE3',
          muted: '#9CA8A6',
          dark: '#16262A',
          darkMuted: '#5B6B69',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        bubble: '0 1px 2px rgba(0,0,0,0.15)',
      },
      keyframes: {
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.5' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
      },
      animation: {
        typingDot: 'typingDot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
