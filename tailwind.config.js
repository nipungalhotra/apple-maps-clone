/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
          teal: '#5AC8FA',
          gray: {
            50: '#F2F2F7',
            100: '#E5E5EA',
            200: '#D1D1D6',
            300: '#C7C7CC',
            400: '#AEAEB2',
            500: '#8E8E93',
            600: '#636366',
            700: '#48484A',
            800: '#2C2C2E',
            900: '#1C1C1E',
          }
        }
      },
      boxShadow: {
        'apple-card': '0 8px 32px 0 rgba(0, 0, 0, 0.18)',
        'apple-floating': '0 4px 20px rgba(0,0,0,0.12)',
        'apple-pill': '0 2px 10px rgba(0,0,0,0.14)',
      },
      backdropBlur: {
        'apple': '25px',
      }
    },
  },
  plugins: [],
}
