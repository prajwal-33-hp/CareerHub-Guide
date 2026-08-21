/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12172B',
          light: '#1C2340',
          soft: '#4B5266',
        },
        paper: '#F3F4F7',
        signal: {
          DEFAULT: '#FFB020',
          dark: '#E09400',
        },
        success: '#1F9D6C',
        danger: '#E4572E',
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'perforation': 'radial-gradient(circle, #E3E5EA 1.5px, transparent 1.5px)',
      },
      backgroundSize: {
        'perforation': '10px 10px',
      },
    },
  },
  plugins: [],
}
