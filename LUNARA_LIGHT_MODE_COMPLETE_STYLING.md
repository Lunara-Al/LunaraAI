# LUNARA AI - COMPLETE LIGHT MODE STYLING CODE

## 1. TAILWIND CONFIG (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
```

---

## 2. INDEX.CSS - COMPLETE STYLING

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ========================================
   LIGHT MODE - Glass Bubble Moon Theme
   ======================================== */
:root {
  --button-outline: rgba(107, 91, 255, 0.2);
  --badge-outline: rgba(107, 91, 255, 0.15);
  --opaque-button-border-intensity: -8;
  --elevate-1: rgba(255, 255, 255, 0.1);
  --elevate-2: rgba(255, 255, 255, 0.2);
  
  /* Background Colors */
  --background: 245 50% 96%;
  --foreground: 258 70% 20%;
  --border: 270 60% 85%;
  
  /* Card Colors */
  --card: 250 30% 98%;
  --card-foreground: 258 70% 20%;
  --card-border: 270 50% 85%;
  
  /* Sidebar Colors */
  --sidebar: 250 20% 96%;
  --sidebar-foreground: 258 60% 25%;
  --sidebar-border: 270 40% 88%;
  --sidebar-primary: 270 80% 65%;
  --sidebar-primary-foreground: 270 80% 98%;
  --sidebar-accent: 270 30% 92%;
  --sidebar-accent-foreground: 258 60% 25%;
  --sidebar-ring: 270 80% 65%;
  
  /* Popover Colors */
  --popover: 250 25% 97%;
  --popover-foreground: 258 70% 20%;
  --popover-border: 270 40% 88%;
  
  /* Primary & Secondary */
  --primary: 270 80% 65%;
  --primary-foreground: 270 80% 98%;
  --secondary: 320 75% 68%;
  --secondary-foreground: 320 75% 98%;
  
  /* Text Colors */
  --muted: 258 20% 94%;
  --muted-foreground: 258 25% 50%;
  --accent: 270 35% 95%;
  --accent-foreground: 258 60% 25%;
  
  /* Status Colors */
  --destructive: 0 72% 55%;
  --destructive-foreground: 0 0% 98%;
  
  /* Input & Ring */
  --input: 270 30% 92%;
  --ring: 270 80% 65%;
  
  /* Chart Colors */
  --chart-1: 270 80% 65%;
  --chart-2: 320 75% 68%;
  --chart-3: 258 70% 60%;
  --chart-4: 200 60% 60%;
  --chart-5: 290 70% 65%;
  
  /* Typography */
  --font-sans: 'Poppins', sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: 'Courier New', monospace;
  --radius: 1.25rem;
  
  /* Light Mode Shadows - Cosmic Purple + Pink */
  --shadow-2xs: 0px 2px 8px rgba(107, 91, 255, 0.08), 0px 1px 4px rgba(255, 79, 225, 0.06);
  --shadow-xs: 0px 4px 12px rgba(107, 91, 255, 0.1), 0px 2px 6px rgba(255, 79, 225, 0.08);
  --shadow-sm: 0px 6px 16px rgba(107, 91, 255, 0.12), 0px 3px 8px rgba(255, 79, 225, 0.1);
  --shadow: 0px 8px 20px rgba(107, 91, 255, 0.14), 0px 4px 10px rgba(255, 79, 225, 0.12);
  --shadow-md: 0px 12px 24px rgba(107, 91, 255, 0.16), 0px 6px 12px rgba(255, 79, 225, 0.14);
  --shadow-lg: 0px 16px 32px rgba(107, 91, 255, 0.18), 0px 8px 16px rgba(255, 79, 225, 0.16);
  --shadow-xl: 0px 24px 48px rgba(107, 91, 255, 0.2), 0px 12px 24px rgba(255, 79, 225, 0.18);
  --shadow-2xl: 0px 32px 64px rgba(107, 91, 255, 0.22), 0px 16px 32px rgba(255, 79, 225, 0.2);
  --tracking-normal: 0em;
  --spacing: 0.25rem;

  /* Fallback for older browsers */
  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --sidebar-accent-border: hsl(from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border: hsl(var(--primary));
  --primary-border: hsl(from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border: hsl(var(--secondary));
  --secondary-border: hsl(from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border: hsl(var(--muted));
  --muted-border: hsl(from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border: hsl(var(--accent));
  --accent-border: hsl(from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border: hsl(var(--destructive));
  --destructive-border: hsl(from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}

/* ========================================
   DARK MODE - Enhanced Cosmic Theme
   ======================================== */
.dark {
  --button-outline: rgba(255, 255, 255, 0.15);
  --badge-outline: rgba(255, 255, 255, 0.1);
  --opaque-button-border-intensity: 9;
  --elevate-1: rgba(255, 255, 255, 0.06);
  --elevate-2: rgba(255, 255, 255, 0.12);
  
  --background: 258 70% 4%;
  --foreground: 250 20% 90%;
  --border: 270 40% 18%;
  --card: 258 50% 8%;
  --card-foreground: 250 20% 90%;
  --card-border: 270 35% 20%;
  
  --sidebar: 258 40% 10%;
  --sidebar-foreground: 250 15% 85%;
  --sidebar-border: 270 30% 18%;
  --sidebar-primary: 270 85% 70%;
  --sidebar-primary-foreground: 270 85% 98%;
  --sidebar-accent: 270 35% 18%;
  --sidebar-accent-foreground: 250 15% 85%;
  --sidebar-ring: 270 85% 70%;
  
  --popover: 258 45% 12%;
  --popover-foreground: 250 15% 88%;
  --popover-border: 270 30% 20%;
  
  --primary: 270 85% 70%;
  --primary-foreground: 270 85% 98%;
  --secondary: 320 78% 72%;
  --secondary-foreground: 320 78% 98%;
  
  --muted: 258 25% 22%;
  --muted-foreground: 258 18% 65%;
  --accent: 270 30% 20%;
  --accent-foreground: 258 15% 85%;
  
  --destructive: 0 75% 58%;
  --destructive-foreground: 0 0% 98%;
  
  --input: 270 28% 24%;
  --ring: 270 85% 70%;
  
  --chart-1: 270 85% 75%;
  --chart-2: 320 78% 75%;
  --chart-3: 258 75% 70%;
  --chart-4: 200 68% 68%;
  --chart-5: 290 75% 72%;
  
  /* Dark Mode Shadows - Stronger Cosmic Glow */
  --shadow-2xs: 0px 2px 8px rgba(107, 91, 255, 0.15), 0px 1px 4px rgba(255, 79, 225, 0.12);
  --shadow-xs: 0px 4px 12px rgba(107, 91, 255, 0.2), 0px 2px 6px rgba(255, 79, 225, 0.16);
  --shadow-sm: 0px 6px 16px rgba(107, 91, 255, 0.25), 0px 3px 8px rgba(255, 79, 225, 0.2);
  --shadow: 0px 8px 20px rgba(107, 91, 255, 0.3), 0px 4px 10px rgba(255, 79, 225, 0.25);
  --shadow-md: 0px 12px 24px rgba(107, 91, 255, 0.35), 0px 6px 12px rgba(255, 79, 225, 0.3);
  --shadow-lg: 0px 16px 32px rgba(107, 91, 255, 0.4), 0px 8px 16px rgba(255, 79, 225, 0.35);
  --shadow-xl: 0px 24px 48px rgba(107, 91, 255, 0.45), 0px 12px 24px rgba(255, 79, 225, 0.4);
  --shadow-2xl: 0px 32px 64px rgba(107, 91, 255, 0.5), 0px 16px 32px rgba(255, 79, 225, 0.45);

  --sidebar-primary-border: hsl(var(--sidebar-primary));
  --sidebar-primary-border: hsl(from hsl(var(--sidebar-primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --sidebar-accent-border: hsl(var(--sidebar-accent));
  --sidebar-accent-border: hsl(from hsl(var(--sidebar-accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --primary-border: hsl(var(--primary));
  --primary-border: hsl(from hsl(var(--primary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --secondary-border: hsl(var(--secondary));
  --secondary-border: hsl(from hsl(var(--secondary)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --muted-border: hsl(var(--muted));
  --muted-border: hsl(from hsl(var(--muted)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --accent-border: hsl(var(--accent));
  --accent-border: hsl(from hsl(var(--accent)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
  --destructive-border: hsl(var(--destructive));
  --destructive-border: hsl(from hsl(var(--destructive)) h s calc(l + var(--opaque-button-border-intensity)) / alpha);
}

/* ========================================
   BASE STYLES
   ======================================== */
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply font-sans antialiased bg-background text-foreground;
    position: relative;
    overflow-x: hidden;
  }

  /* Space Background with Stars - Light Mode */
  body::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: 
      radial-gradient(ellipse at 20% 30%, rgba(107, 91, 255, 0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 70%, rgba(255, 79, 225, 0.08) 0%, transparent 50%),
      radial-gradient(2px 2px at 20% 30%, rgba(107, 91, 255, 0.4), transparent),
      radial-gradient(2px 2px at 60% 70%, rgba(255, 79, 225, 0.3), transparent),
      radial-gradient(1px 1px at 50% 50%, rgba(107, 91, 255, 0.3), transparent),
      radial-gradient(1px 1px at 80% 10%, rgba(255, 79, 225, 0.2), transparent),
      radial-gradient(2px 2px at 90% 60%, rgba(107, 91, 255, 0.25), transparent),
      radial-gradient(1px 1px at 33% 50%, rgba(255, 79, 225, 0.2), transparent),
      radial-gradient(1px 1px at 66% 33%, rgba(107, 91, 255, 0.25), transparent);
    background-size: 
      200% 200%,
      200% 200%,
      200px 200px,
      200px 200px,
      300px 300px,
      250px 250px,
      200px 200px,
      300px 300px,
      250px 250px;
    background-position: 
      0% 0%,
      100% 100%,
      0% 0%,
      40% 60%,
      50% 50%,
      80% 10%,
      90% 60%,
      33% 50%,
      66% 33%;
    animation: twinkle 8s ease-in-out infinite alternate;
  }

  /* Twinkling stars animation */
  @keyframes twinkle {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.9;
    }
  }

  /* Light mode overlay for gradient effect */
  body::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: radial-gradient(ellipse at center, transparent 0%, rgba(240, 235, 250, 0.3) 100%);
    pointer-events: none;
  }

  html, body, #root {
    @apply h-full;
  }
}

/* ========================================
   UTILITIES - GLASS EFFECTS
   ======================================== */
@layer utilities {

  /* Glass Bubble Moon Effects */
  .glass {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(107, 91, 255, 0.15);
    box-shadow: 0 8px 32px rgba(107, 91, 255, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  }

  .dark .glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(107, 91, 255, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border: 1px solid rgba(107, 91, 255, 0.2);
    box-shadow: 
      0 8px 32px rgba(107, 91, 255, 0.12),
      0 0 0 1px rgba(255, 255, 255, 0.9) inset,
      0 0 40px rgba(107, 91, 255, 0.08);
  }

  .dark .glass-card {
    background: rgba(40, 30, 80, 0.3);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(107, 91, 255, 0.3);
    box-shadow: 
      0 8px 32px rgba(107, 91, 255, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 0 40px rgba(107, 91, 255, 0.15);
  }

  .glass-button {
    background: rgba(107, 91, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(107, 91, 255, 0.3);
  }

  .dark .glass-button {
    background: rgba(107, 91, 255, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(107, 91, 255, 0.4);
  }

  .moon-glow {
    box-shadow: 
      0 0 20px rgba(107, 91, 255, 0.25),
      0 0 40px rgba(255, 79, 225, 0.15),
      0 0 60px rgba(107, 91, 255, 0.08);
  }

  .dark .moon-glow {
    box-shadow: 
      0 0 30px rgba(107, 91, 255, 0.5),
      0 0 60px rgba(255, 79, 225, 0.3),
      0 0 90px rgba(107, 91, 255, 0.2);
  }

  /* Enhanced light mode shadows */
  .shadow-moon-light {
    box-shadow: 0 10px 40px rgba(107, 91, 255, 0.15), 0 4px 12px rgba(255, 79, 225, 0.08);
  }

  .shadow-moon-glow-lg {
    box-shadow: 0 20px 60px rgba(107, 91, 255, 0.2), 0 0 40px rgba(255, 79, 225, 0.12);
  }

  /* Hide ugly search cancel button in Chrome */
  input[type="search"]::-webkit-search-cancel-button {
    @apply hidden;
  }

  /* Placeholder styling for contentEditable div */
  [contenteditable][data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: hsl(var(--muted-foreground));
    pointer-events: none;
  }

  .no-default-hover-elevate {}
  .no-default-active-elevate {}

  /* Toggle Elevation System */
  .toggle-elevate::before,
  .toggle-elevate-2::before {
    content: "";
    pointer-events: none;
    position: absolute;
    inset: 0px;
    border-radius: inherit;
    z-index: -1;
  }

  .toggle-elevate.toggle-elevated::before {
    background-color: var(--elevate-2);
  }

  .border.toggle-elevate::before {
    inset: -1px;
  }

  /* Hover & Active Elevation System */
  .hover-elevate:not(.no-default-hover-elevate),
  .active-elevate:not(.no-default-active-elevate),
  .hover-elevate-2:not(.no-default-hover-elevate),
  .active-elevate-2:not(.no-default-active-elevate) {
    position: relative;
    z-index: 0;
  }

  .hover-elevate:not(.no-default-hover-elevate)::after,
  .active-elevate:not(.no-default-active-elevate)::after,
  .hover-elevate-2:not(.no-default-hover-elevate)::after,
  .active-elevate-2:not(.no-default-active-elevate)::after {
    content: "";
    pointer-events: none;
    position: absolute;
    inset: 0px;
    border-radius: inherit;
    z-index: 999;
  }

  .hover-elevate:hover:not(.no-default-hover-elevate)::after,
  .active-elevate:active:not(.no-default-active-elevate)::after {
    background-color: var(--elevate-1);
  }

  .hover-elevate-2:hover:not(.no-default-hover-elevate)::after,
  .active-elevate-2:active:not(.no-default-active-elevate)::after {
    background-color: var(--elevate-2);
  }

  .border.hover-elevate:not(.no-hover-interaction-elevate)::after,
  .border.active-elevate:not(.no-active-interaction-elevate)::after,
  .border.hover-elevate-2:not(.no-hover-interaction-elevate)::after,
  .border.active-elevate-2:not(.no-active-interaction-elevate)::after,
  .border.hover-elevate:not(.no-hover-interaction-elevate)::after {
    inset: -1px;
  }
}
```

---

## 3. COMPONENT STYLING PATTERNS (React JSX)

```jsx
/* ========================================
   LANDING PAGE
   ======================================== */

// Main Container
<div className="min-h-screen flex flex-col relative overflow-hidden bg-white dark:bg-black">

// Header
<header className="glass sticky top-0 z-50 px-4 py-4 md:px-8 md:py-6 flex justify-between items-center backdrop-blur-xl">
  <div className="flex items-center gap-3">
    <img className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover moon-glow" />
    <span className="text-xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
      Lunara AI
    </span>
  </div>
  <Button className="bg-gradient-to-r from-primary to-secondary moon-glow">
    Sign In
  </Button>
</header>

// Main Content
<main className="flex-1 flex items-center justify-center px-4 py-12 md:py-20 bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950">
  <div className="max-w-6xl mx-auto text-center space-y-12">
    
    // Hero Title
    <div className="relative inline-block">
      <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/30 via-secondary/30 to-primary/30 rounded-full" />
      <h1 className="relative text-5xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700">
        Create Cosmic
        <br />
        ASMR Videos
      </h1>
    </div>

    // Feature Cards
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
      <Card className="p-8 space-y-4 hover-elevate group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full group-hover:bg-primary/30 transition-all" />
          <Video className="w-14 h-14 text-primary mx-auto relative" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI-Powered</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Advanced AI creates stunning cosmic ASMR videos from your text prompts
        </p>
      </Card>
    </div>
  </div>
</main>

// Footer
<footer className="glass px-4 py-8 text-center backdrop-blur-xl bg-gradient-to-r from-white/80 to-slate-50/80 dark:from-black/80 dark:to-slate-950/80">
  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
    <img className="w-5 h-5 rounded-md object-cover" />
    <span>Lunara AI - Cosmic Video Generation Platform</span>
  </div>
</footer>

/* ========================================
   HOME PAGE - SHOWCASE SECTION
   ======================================== */

// Showcase Container
<div className="w-full max-w-6xl mx-auto mt-20 md:mt-32 px-4 pb-20">
  
  // Showcase Header
  <div className="text-center space-y-4 mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <Badge variant="secondary" className="mb-3 backdrop-blur-sm">
      ✨ Showcase
    </Badge>
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent leading-tight">
      Cosmic ASMR Gallery
    </h2>
    <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
      Experience the mesmerizing fusion of artificial intelligence and ethereal ASMR visuals. Each video is a journey through cosmic realms.
    </p>
  </div>

  // Showcase Grid
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
    {showcaseVideos.map((video, index) => (
      <div key={index} className="group relative bg-card rounded-2xl overflow-hidden border border-card-border hover-elevate transition-all duration-300 shadow-sm hover:shadow-lg">
        
        {/* Video Container */}
        <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-black/40">
          <img
            src={video.image}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 dark:bg-black/60 backdrop-blur-sm">
            <div className="rounded-full bg-gradient-to-r from-primary to-secondary p-3 shadow-lg">
              <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5 space-y-2">
          <h3 className="text-sm md:text-base font-bold text-foreground line-clamp-1">
            {video.title}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
            {video.description}
          </p>
          <div className="pt-2 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground font-medium">AI-Generated</span>
          </div>
        </div>
      </div>
    ))}
  </div>

  // CTA Section
  <div className="text-center mt-12 md:mt-16 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
    <div className="space-y-2">
      <p className="text-base md:text-lg text-muted-foreground font-medium">
        Ready to create your own cosmic ASMR masterpiece?
      </p>
      <p className="text-xs md:text-sm text-muted-foreground">
        Join thousands of creators bringing their imagination to life
      </p>
    </div>
    <Button
      size="lg"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="bg-gradient-to-r from-primary via-secondary to-primary text-white shadow-lg hover:shadow-xl moon-glow"
    >
      <Sparkles className="w-5 h-5 mr-2" />
      Start Creating Now
    </Button>
  </div>
</div>

/* ========================================
   HOME PAGE - FORM SECTION
   ======================================== */

// Main Form Container
<div className="min-h-screen px-4 py-8 md:p-4 bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900">
  
  // Header
  <div className="text-center space-y-3 md:space-y-4">
    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-gradient">
      Lunara AI
    </h1>
    <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
      <span className="inline-flex items-center gap-2 flex-wrap justify-center">
        <span>Write your prompt and add a reference image to guide your cosmic video</span>
        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
      </span>
    </p>
  </div>

  // Form Card
  <Card className="p-6 md:p-8">
    <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
      
      {/* Image Upload */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-secondary" />
          Reference Image (Recommended)
        </Label>
        {!imagePreview ? (
          <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-primary/30 dark:border-primary/40 rounded-lg bg-primary/5 dark:bg-primary/15 hover:border-primary/50 dark:hover:border-primary/60 hover:bg-primary/10 dark:hover:bg-primary/20 transition-all cursor-pointer group">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-6 h-6 text-primary/60 dark:text-primary/50 group-hover:text-primary dark:group-hover:text-primary/80 transition-colors" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground dark:text-white">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, GIF, BMP, SVG or TIFF (up to 500MB)
                </p>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-primary/15 p-3">
            <img 
              src={imagePreview}
              alt="Reference"
              className="w-full h-48 object-cover rounded-md"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <Label htmlFor="prompt" className="text-sm font-semibold flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          Your Cosmic Vision
        </Label>
        <Input
          id="prompt"
          type="text"
          placeholder="e.g. a glowing crystal peach sliced in slow motion"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-base h-12"
        />
      </div>

      {/* Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Length Buttons */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground">
            Video Length
          </Label>
          <div className="flex gap-2">
            {[5, 10, 15].map((len) => (
              <Button
                key={len}
                type="button"
                size="sm"
                variant={length === len ? "default" : "outline"}
                onClick={() => setLength(len)}
                className={`flex-1 ${length === len ? "moon-glow" : ""}`}
              >
                {len}s
              </Button>
            ))}
          </div>
        </div>

        {/* Style Input */}
        <div className="space-y-3">
          <Label htmlFor="style" className="text-xs font-semibold text-muted-foreground">
            Style (Optional)
          </Label>
          <Input
            id="style"
            type="text"
            placeholder="e.g. cinematic"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground">
          Aspect Ratio
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { ratio: "1:1", label: "1:1", platform: "Instagram" },
            { ratio: "16:9", label: "16:9", platform: "YouTube" },
            { ratio: "9:16", label: "9:16", platform: "TikTok" }
          ].map(({ ratio, label, platform }) => (
            <Button
              key={ratio}
              type="button"
              variant={aspectRatio === ratio ? "default" : "outline"}
              onClick={() => setAspectRatio(ratio)}
              className={`flex flex-col items-center justify-center h-auto py-3 ${aspectRatio === ratio ? "moon-glow" : ""}`}
            >
              <span className="text-sm font-bold">{label}</span>
              <span className="text-xs opacity-70">{platform}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <Button
        type="submit"
        size="lg"
        disabled={generateVideoMutation.isPending || !prompt.trim() || isProcessingImage}
        className="w-full bg-gradient-to-r from-primary to-secondary moon-glow text-white"
      >
        {generateVideoMutation.isPending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating your masterpiece...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5 mr-2" />
            Generate Cosmic Video
          </>
        )}
      </Button>
    </form>
  </Card>
</div>

/* ========================================
   MEMBERSHIP PAGE - FEATURE CARDS
   ======================================== */

<div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 
                border border-purple-500/20 dark:border-purple-500/30 
                hover:border-purple-500/40 dark:hover:border-purple-500/50 
                hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-all">
  <div className="flex items-start gap-3">
    <Calendar className="w-6 h-6 text-purple-500 dark:text-purple-400 flex-shrink-0 mt-1" />
    <div className="space-y-2">
      <h4 className="font-semibold text-foreground">30-Day Planning View</h4>
      <p className="text-sm text-muted-foreground">
        Visual calendar interface with 30-day preview to plan and organize your cosmic ASMR content
      </p>
    </div>
  </div>
</div>

/* ========================================
   PROFILE PAGE - LOADING STATE
   ======================================== */

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950">
  <div className="flex flex-col items-center gap-4">
    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    <p className="text-slate-600 dark:text-slate-400 text-sm">Loading your profile...</p>
  </div>
</div>

/* ========================================
   GALLERY PAGE
   ======================================== */

<div className="min-h-screen bg-gradient-to-br from-background via-background to-card dark:from-background dark:via-slate-950 dark:to-slate-900 px-4 py-6 md:p-8">
  <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
    
    {/* Gallery Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {videos.map((video) => (
        <div
          key={video.id}
          className="group relative bg-card rounded-lg overflow-hidden border border-card-border hover-elevate transition-all"
        >
          <div className="aspect-square">
            <video
              src={video.videoUrl}
              className="w-full h-full object-cover"
              loop
              muted
              onMouseEnter={(e) => (e.currentTarget).play()}
              onMouseLeave={(e) => {
                const vid = e.currentTarget;
                vid.pause();
                vid.currentTime = 0;
              }}
            />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 md:p-4 space-y-2 md:space-y-3">
            <p className="text-white text-xs md:text-sm line-clamp-2">
              {video.prompt}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 text-xs md:text-sm"
              >
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Download
              </Button>
              <Button
                size="sm"
                variant="destructive"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

## 4. KEY COLOR VALUES REFERENCE

```
LIGHT MODE COLORS (HSL Format):
- Background: 245 50% 96%     (Very Light Purple-White)
- Foreground: 258 70% 20%     (Dark Purple Text)
- Primary: 270 80% 65%        (Bright Cosmic Purple)
- Secondary: 320 75% 68%      (Pink-Magenta)
- Card: 250 30% 98%           (Almost White Card)
- Muted: 258 20% 94%          (Light Gray-Purple)
- Input: 270 30% 92%          (Light Input Background)
- Border: 270 60% 85%         (Light Purple Border)

SHADOW COLORS (RGBA):
- Purple: rgba(107, 91, 255, opacity)
- Pink: rgba(255, 79, 225, opacity)
- Light opacity range: 0.08 - 0.22
```

---

## 5. GRADIENT PATTERNS

```jsx
// Hero Gradient
className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent"

// Page Background
className="bg-gradient-to-br from-white via-white to-slate-50 dark:from-black dark:via-black dark:to-slate-950"

// Button Gradient
className="bg-gradient-to-r from-primary to-secondary"
className="bg-gradient-to-r from-primary via-secondary to-primary"

// Feature Card Overlay
className="bg-gradient-to-br from-primary/5 to-transparent"

// Overlay Gradient
className="bg-gradient-to-t from-black/80 via-black/40 to-transparent"
```

---

This is your **complete copyable light mode styling code** for Lunara AI! 🌙✨
