/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
          primary: {
              '50': '#eff6ff',
              '100': '#dbeafe',
              '200': '#bfdbfe',
              '300': '#93c5fd',
              '400': '#60a5fa',
              '500': '#3b82f6',
              '600': '#2563eb',
              '700': '#1d4ed8',
              '800': '#1e40af',
              '900': '#1e3a8a',
              '950': '#172554',
          },
          brand: {
              'light': '#f0f9ff',
              'dark': '#1e3a8a',
              'DEFAULT': '#2563eb',
          }
      },
      animation: {
          'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
