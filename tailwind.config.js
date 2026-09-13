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
        navy: {
          DEFAULT: '#002349',
          50: '#F0F4F8',
          100: '#DFE9F2',
          200: '#BFD3E6',
          300: '#8FAFCF',
          400: '#4D83B3',
          500: '#1A5E9E',
          600: '#004080',
          700: '#003063',
          800: '#002349',
          900: '#001630',
        },
        burgundy: {
          DEFAULT: '#5C1A2A',
          50: '#FAF0F2',
          100: '#F5E0E4',
          200: '#ECC5CD',
          300: '#DE9EAC',
          400: '#C9687E',
          500: '#AC3D57',
          600: '#87243C',
          700: '#5C1A2A',
          800: '#42101D',
          900: '#2B0912',
        },
        gold: {
          DEFAULT: '#957C3D',
          50: '#FBF9F2',
          100: '#F6F2E3',
          200: '#EBE3C4',
          300: '#DDCEA0',
          400: '#C9B274',
          500: '#957C3D',
          600: '#7E672E',
          700: '#645121',
          800: '#493A14',
          900: '#2E2309',
        },
        wheat: {
          DEFAULT: '#957C3D',
          50: '#FBF9F2',
          100: '#F6F2E3',
          200: '#EBE3C4',
          300: '#DDCEA0',
          400: '#C9B274',
          500: '#957C3D',
          600: '#7E672E',
          700: '#645121',
          800: '#493A14',
          900: '#2E2309',
        },
        feldgrau: {
          DEFAULT: '#002349',
          dark: '#001833',
        },
        cream: {
          DEFAULT: '#FFFFFF',
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
          500: '#94A3B8',
        },
        ink: {
          DEFAULT: '#002349',
          50: '#F0F4F8',
          100: '#DFE9F2',
          200: '#BFD3E6',
          300: '#8FAFCF',
          400: '#4D83B3',
          500: '#1A5E9E',
          600: '#004080',
          700: '#003063',
          800: '#002349',
          900: '#001630',
        },
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
          '1': '#002349',
          '2': '#5C1A2A',
          '3': '#957C3D',
          '4': '#4D83B3',
          '5': '#C9687E'
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
