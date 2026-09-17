/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- 5-Color Image Palette ---
        teal: {
          DEFAULT: '#557373',
          50: '#F2F6F6',
          100: '#E3ECEC',
          200: '#C6D8D8',
          300: '#9FBDBD',
          400: '#769898',
          500: '#557373',
          600: '#445C5C',
          700: '#354747',
          800: '#263333',
          900: '#171F1F',
        },
        olive: {
          DEFAULT: '#272401',
          50: '#F8F7F0',
          100: '#F0EEDC',
          200: '#E0DDB8',
          300: '#C8C28A',
          400: '#8E873E',
          500: '#5E5718',
          600: '#47420B',
          700: '#363204',
          800: '#272401',
          900: '#141300',
        },
        ice: {
          DEFAULT: '#DFE5F3',
          50: '#F7F9FC',
          100: '#EEF2F9',
          200: '#DFE5F3',
          300: '#C4D1EA',
          400: '#A4B8DC',
          500: '#809CCC',
          600: '#5E7BB8',
          700: '#466099',
          800: '#324673',
          900: '#202D4C',
        },
        cream: {
          DEFAULT: '#F2EFEA',
          50: '#FAF9F7',
          100: '#F7F5F2',
          200: '#F2EFEA',
          300: '#E5E0D6',
          400: '#D3CBBC',
          500: '#B8AC97',
          600: '#978972',
          700: '#756955',
          800: '#554B3B',
          900: '#362F24',
        },
        obsidian: {
          DEFAULT: '#0D0D0D',
          50: '#F5F5F5',
          100: '#EBEBEB',
          200: '#D6D6D6',
          300: '#A8A8A8',
          400: '#707070',
          500: '#424242',
          600: '#262626',
          700: '#1A1A1A',
          800: '#0D0D0D',
          900: '#050505',
        },

        // --- Aliases for compatibility & richness ---
        ink: {
          DEFAULT: '#0D0D0D',
          50: '#F5F5F5',
          100: '#EBEBEB',
          200: '#D6D6D6',
          300: '#A8A8A8',
          400: '#707070',
          500: '#424242',
          600: '#262626',
          700: '#1A1A1A',
          800: '#0D0D0D',
          900: '#050505',
        },
        navy: {
          DEFAULT: '#0D0D0D',
          50: '#F5F5F5',
          100: '#EBEBEB',
          200: '#D6D6D6',
          300: '#A8A8A8',
          400: '#707070',
          500: '#424242',
          600: '#262626',
          700: '#1A1A1A',
          800: '#0D0D0D',
          900: '#050505',
        },
        burgundy: {
          DEFAULT: '#557373',
          50: '#F2F6F6',
          100: '#E3ECEC',
          200: '#C6D8D8',
          300: '#9FBDBD',
          400: '#769898',
          500: '#557373',
          600: '#445C5C',
          700: '#354747',
          800: '#263333',
          900: '#171F1F',
        },
        gold: {
          DEFAULT: '#272401',
          50: '#F8F7F0',
          100: '#F0EEDC',
          200: '#E0DDB8',
          300: '#C8C28A',
          400: '#8E873E',
          500: '#5E5718',
          600: '#47420B',
          700: '#363204',
          800: '#272401',
          900: '#141300',
        },
        wheat: {
          DEFAULT: '#DFE5F3',
          50: '#F7F9FC',
          100: '#EEF2F9',
          200: '#DFE5F3',
          300: '#C4D1EA',
          400: '#A4B8DC',
          500: '#809CCC',
          600: '#5E7BB8',
          700: '#466099',
          800: '#324673',
          900: '#202D4C',
        },
        feldgrau: {
          DEFAULT: '#272401',
          dark: '#0D0D0D',
        },

        // --- Semantic Tokens ---
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': '#557373',
          '2': '#272401',
          '3': '#DFE5F3',
          '4': '#0D0D0D',
          '5': '#769898'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
