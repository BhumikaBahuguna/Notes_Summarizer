/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#D95A40',
          'deep-red': '#8B2620',
          'dark-brown': '#2A1B18',
          beige: '#F5F2EB',
          coral: '#F28A72',
          gold: '#D4AF37',
        },
        dark: {
          DEFAULT: '#120E0D',
          surface: '#1C1614',
          'surface-light': '#261F1D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['ui-serif', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}
