import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'media',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f9f6f3',
          100: '#f3eee8', // Beige Background
          200: '#e6dcd3',
          300: '#d1bea8',
          400: '#b89c7d',
          500: '#a37f5b', // Primary Goldish
          600: '#8a6446',
          700: '#6f5038',
          800: '#584131',
          900: '#1c1917', // Dark Text
          950: '#0c0a09', // Deepest Text/Bg
          beige: '#f3eee8', // Alias
        },
      },
      fontFamily: {
        sans: ['var(--font-lato)', 'sans-serif'],
        serif: ['var(--font-playfair)', 'serif'],
        handwriting: ['var(--font-pinyon)', 'cursive'],
      },
      animation: {
        "fade-in": "fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-up": "fadeInUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "reveal-up": "revealUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-slow": "scaleSlow 20s linear infinite alternate",
        "marquee-scroll": "marqueeScroll 40s linear infinite",
        "spin-slow": "spin 12s linear infinite",
        "grain": "grain 8s steps(10) infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        // New premium animations
        "clip-up": "clipUp 1.2s cubic-bezier(0.76, 0, 0.24, 1) forwards",
        "float": "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out 2s infinite",
        "steam": "steam 3s ease-out infinite",
        "glow": "glow 3s ease-in-out infinite",
        "scale-in": "scaleIn 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-mask": "slideMask 1.4s cubic-bezier(0.76, 0, 0.24, 1) forwards",
        "orb-1": "orbDrift1 28s ease-in-out infinite",
        "orb-2": "orbDrift2 36s ease-in-out infinite",
        "orb-3": "orbDrift3 22s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        revealUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        scaleSlow: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.05)" },
        },
        marqueeScroll: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        grain: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "10%": { transform: "translate(-5%, -10%)" },
          "20%": { transform: "translate(-15%, 5%)" },
          "30%": { transform: "translate(7%, -25%)" },
          "40%": { transform: "translate(-5%, 25%)" },
          "50%": { transform: "translate(-15%, 10%)" },
          "60%": { transform: "translate(15%, 0%)" },
          "70%": { transform: "translate(0%, 15%)" },
          "80%": { transform: "translate(3%, 35%)" },
          "90%": { transform: "translate(-10%, 10%)" },
        },
        // New premium keyframes
        clipUp: {
          "0%": { clipPath: "inset(100% 0 0 0)", transform: "translateY(30px)" },
          "100%": { clipPath: "inset(0% 0 0 0)", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(2deg)" },
        },
        steam: {
          "0%": { transform: "translateY(0) scaleX(1)", opacity: "0.6" },
          "50%": { transform: "translateY(-30px) scaleX(1.2)", opacity: "0.3" },
          "100%": { transform: "translateY(-60px) scaleX(0.8)", opacity: "0" },
        },
        glow: {
          "0%, 100%": { textShadow: "0 0 20px rgba(163, 127, 91, 0.3)" },
          "50%": { textShadow: "0 0 40px rgba(163, 127, 91, 0.6)" },
        },
        scaleIn: {
          "0%": { transform: "scale(1.3)", filter: "blur(20px)", opacity: "0" },
          "100%": { transform: "scale(1)", filter: "blur(0px)", opacity: "1" },
        },
        slideMask: {
          "0%": { clipPath: "inset(0 100% 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)" },
        },
        orbDrift1: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "25%": { transform: "translate(4%, -6%) scale(1.06)" },
          "50%": { transform: "translate(-3%, 4%) scale(0.96)" },
          "75%": { transform: "translate(6%, 2%) scale(1.03)" },
        },
        orbDrift2: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "30%": { transform: "translate(-5%, 5%) scale(1.08)" },
          "60%": { transform: "translate(4%, -3%) scale(0.94)" },
          "80%": { transform: "translate(-2%, -5%) scale(1.04)" },
        },
        orbDrift3: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "40%": { transform: "translate(3%, 6%) scale(1.05)" },
          "70%": { transform: "translate(-4%, -4%) scale(0.97)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
