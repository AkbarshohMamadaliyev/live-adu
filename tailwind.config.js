/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        hikred: "#E60012",
        hikpurple: {
          DEFAULT: "#7c3aed",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          900: "#2e1065",
        },
      },
      boxShadow: {
        "purple-glow": "0 0 0 2px #7c3aed, 0 0 16px 2px rgba(124,58,237,0.45)",
        "purple-glow-sm": "0 0 0 1px #7c3aed, 0 0 8px 1px rgba(124,58,237,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
