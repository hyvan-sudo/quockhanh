/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        vnred: '#C8102E',
        vndeepred: '#7A0C1E',
        vngold: '#FFCD00',
      },
      fontFamily: {
        display: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        firework: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        popin: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        }
      },
      animation: {
        firework: 'firework 1.2s ease-out forwards',
        popin: 'popin .25s ease-out forwards',
        shimmer: 'shimmer 3s linear infinite',
      }
    },
  },
  plugins: [],
}
