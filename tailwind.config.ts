import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        edu: {
          blue: "hsl(var(--edu-blue))",
          teal: "hsl(var(--edu-teal))",
          orange: "hsl(var(--edu-orange))",
          pink: "hsl(var(--edu-pink))",
          purple: "hsl(var(--edu-purple))",
          yellow: "hsl(var(--edu-yellow))",
          green: "hsl(var(--edu-green))",
        },
      },
      fontFamily: {
        display: ["Nunito", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "buddy-bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "buddy-celebrate": {
          "0%": { transform: "translateY(0) rotate(0deg)" },
          "30%": { transform: "translateY(-8px) rotate(5deg)" },
          "60%": { transform: "translateY(0) rotate(-5deg)" },
          "100%": { transform: "translateY(0) rotate(0deg)" },
        },
        "buddy-sad-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "15%, 45%, 75%": { transform: "translateX(-4px)" },
          "30%, 60%": { transform: "translateX(4px)" },
        },
        "buddy-idle-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "buddy-exit": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.9) translateY(10px)", opacity: "0" },
        },
        "bubble-pop": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // Buddy Room: idle mood/cue loops (BuddyStage).
        "buddy-float": {
          "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
          "50%": { transform: "translateY(-14px) rotate(1deg)" },
        },
        "buddy-breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.03)" },
        },
        "buddy-hungry": {
          "0%, 100%": { transform: "translateY(0) rotate(4deg)" },
          "35%": { transform: "translateY(-16px) rotate(4deg) scaleY(1.03)" },
          "55%": { transform: "translateY(0) rotate(4deg) scaleY(0.96)" },
          "70%": { transform: "translateY(-8px) rotate(4deg)" },
        },
        "buddy-bored": {
          "0%, 100%": { transform: "translateX(-6px) rotate(-3deg) scaleY(0.95)" },
          "50%": { transform: "translateX(6px) rotate(3deg) scaleY(0.95)" },
        },
        "buddy-tired": {
          "0%, 100%": { transform: "translateY(0) rotate(-2deg)" },
          "45%": { transform: "translateY(18px) rotate(-12deg) scaleY(0.92)" },
          "60%": { transform: "translateY(6px) rotate(-6deg)" },
        },
        "buddy-itchy": {
          "0%, 100%": { transform: "translateX(0) rotate(0deg)" },
          "20%": { transform: "translateX(-7px) rotate(-4deg)" },
          "40%": { transform: "translateX(7px) rotate(4deg)" },
          "60%": { transform: "translateX(-5px) rotate(-3deg)" },
          "80%": { transform: "translateX(5px) rotate(3deg)" },
        },
        "buddy-ill": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg) scale(0.97)" },
          "25%": { transform: "translate(-2px, 1px) rotate(-1deg) scale(0.97)" },
          "50%": { transform: "translate(2px, -1px) rotate(1deg) scale(0.96)" },
          "75%": { transform: "translate(-1px, 2px) rotate(-0.5deg) scale(0.97)" },
        },
        "buddy-hint": {
          "0%, 100%": { transform: "translateY(0) rotate(-3deg)" },
          "50%": { transform: "translateY(-8px) rotate(3deg)" },
        },
        // Buddy Room: one-shot Care Action reactions (BuddyStage).
        "buddy-eat": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "15%": { transform: "translateY(-14px) scale(1.06)" },
          "30%": { transform: "translateY(0) scaleY(0.9) scaleX(1.08)" },
          "45%": { transform: "translateY(-10px) scale(1.04)" },
          "60%": { transform: "translateY(0) scaleY(0.94) scaleX(1.05)" },
          "80%": { transform: "translateY(-6px) scale(1.02)" },
        },
        "buddy-play": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "20%": { transform: "translateY(-26px) rotate(-14deg)" },
          "40%": { transform: "translateY(0) rotate(10deg) scaleY(0.92)" },
          "60%": { transform: "translateY(-20px) rotate(14deg)" },
          "80%": { transform: "translateY(0) rotate(-6deg) scaleY(0.95)" },
        },
        "buddy-doze": {
          "0%": { transform: "translateY(0) rotate(0deg) scale(1)" },
          "50%": { transform: "translateY(10px) rotate(-8deg) scale(1.03)" },
          "100%": { transform: "translateY(14px) rotate(-10deg) scale(1)" },
        },
        "buddy-heal": {
          "0%": { transform: "translateX(0) scale(0.97)" },
          "10%": { transform: "translateX(-4px) scale(0.97)" },
          "20%": { transform: "translateX(4px) scale(0.97)" },
          "30%": { transform: "translateX(-3px) scale(0.98)" },
          "40%": { transform: "translateX(3px) scale(0.98)" },
          "70%": { transform: "translateY(-16px) scale(1.06)" },
          "100%": { transform: "translateY(0) scale(1)" },
        },
        "buddy-wash": {
          "0%, 100%": { transform: "rotate(0deg) translateX(0)" },
          "20%": { transform: "rotate(-8deg) translateX(-8px)" },
          "45%": { transform: "rotate(8deg) translateX(8px)" },
          "70%": { transform: "rotate(-5deg) translateX(-5px)" },
          "85%": { transform: "rotate(4deg) translateX(4px)" },
        },
        // Buddy Room: Care Action effect particles (BuddyStage).
        "fx-rise": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.6)" },
          "25%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-70px) scale(1.15)" },
        },
        "fx-pop": {
          "0%": { opacity: "0", transform: "scale(0.4) rotate(-20deg)" },
          "30%": { opacity: "1", transform: "scale(1.2) rotate(10deg)" },
          "100%": { opacity: "0", transform: "scale(0.9) rotate(-10deg) translateY(-24px)" },
        },
        "fx-bubble": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.5)" },
          "30%": { opacity: "0.95" },
          "100%": { opacity: "0", transform: "translateY(-80px) translateX(12px) scale(1.25)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "buddy-bounce-in": "buddy-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "buddy-celebrate": "buddy-celebrate 0.6s ease-in-out",
        "buddy-sad-shake": "buddy-sad-shake 0.5s ease-in-out",
        "buddy-idle-float": "buddy-idle-float 3s ease-in-out infinite",
        "buddy-exit": "buddy-exit 0.4s ease-in forwards",
        "bubble-pop": "bubble-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "buddy-float": "buddy-float 4s ease-in-out infinite",
        "buddy-breathe": "buddy-breathe 5s ease-in-out infinite",
        "buddy-hungry": "buddy-hungry 2.2s ease-in-out infinite",
        "buddy-bored": "buddy-bored 5.5s ease-in-out infinite",
        "buddy-tired": "buddy-tired 3.5s ease-in-out infinite",
        "buddy-itchy": "buddy-itchy 2.6s ease-in-out infinite",
        "buddy-ill": "buddy-ill 1.4s ease-in-out infinite",
        "buddy-hint": "buddy-hint 3s ease-in-out infinite",
        "buddy-eat": "buddy-eat 1.6s ease-in-out",
        "buddy-play": "buddy-play 1.6s ease-in-out",
        "buddy-doze": "buddy-doze 1.6s ease-in-out forwards",
        "buddy-heal": "buddy-heal 1.6s ease-in-out",
        "buddy-wash": "buddy-wash 1.6s ease-in-out",
        "fx-rise": "fx-rise 1.4s ease-out forwards",
        "fx-pop": "fx-pop 1.2s ease-out forwards",
        "fx-bubble": "fx-bubble 1.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
