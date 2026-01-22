/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#136dec',
          hover: '#115dc7'
        },
        background: {
          light: '#f6f7f8',
          dark: '#101822'
        },
        surface: {
          dark: '#1c2431'
        },
        border: {
          dark: '#2d3748'
        },
        text: {
          primary: '#ffffff',
          secondary: '#9da8b9'
        }
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: [
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px'
      }
    }
  },
  plugins: []
}
