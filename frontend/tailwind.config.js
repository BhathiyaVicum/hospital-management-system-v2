/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#f8f9ff',
        'surface-container': '#e5eeff',
        'surface-container-low': '#eff4ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#dce9ff',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#3d4947',
        primary: '#00685f',
        'primary-container': '#008378',
        'on-primary': '#ffffff',
        'on-primary-container': '#f4fffc',
        secondary: '#565e74',
        'secondary-container': '#dae2fd',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#5c647a',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

