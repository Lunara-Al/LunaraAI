# Lunara AI - Design Guidelines

## Design Approach
**Selected Approach:** Reference-Based (Creative Generation Tools)  
**Primary References:** Midjourney interface, RunwayML, creative AI tools  
**Core Principle:** Focused, immersive single-purpose interface optimized for video generation workflow

---

## Layout System

**Container Strategy:**
- Single-viewport centered layout (flex-centered vertically and horizontally)
- Maximum content width: `max-w-4xl`
- Vertical spacing: Use Tailwind units of **4, 8, 12, 16** consistently (e.g., `space-y-8`, `py-12`, `gap-4`)

**Page Structure:**
```
[Centered Container]
  - Brand/Title (large, prominent)
  - Subtitle/Description (supporting text)
  - Prompt Input Form (horizontal layout)
  - Video Display Area (conditional, appears after generation)
  - Error Messages (conditional)
```

---

## Typography

**Font Families:**
- Primary: `'Poppins', sans-serif` (via Google Fonts CDN)
- Weights: 400 (regular), 600 (semibold), 700 (bold)

**Hierarchy:**
```
H1 (Title): text-5xl md:text-6xl, font-bold
Subtitle: text-lg md:text-xl, font-normal
Input: text-base md:text-lg
Button: text-base, font-semibold
Error: text-sm md:text-base
```

---

## Component Library

### 1. Header Section
- **Title:** Large display text with gradient treatment capability
- **Subtitle:** Supporting descriptive text below title
- **Spacing:** `space-y-4` between title and subtitle

### 2. Generation Form
**Layout:** Horizontal flex layout (`flex gap-4`)
- **Text Input:**
  - Width: `flex-1` (takes remaining space)
  - Padding: `px-4 py-3`
  - Border radius: `rounded-lg`
  - Placeholder: Descriptive example ("e.g. a glowing crystal peach sliced in slow motion")
  - Focus state: Ring treatment (`focus:ring-2`)

- **Submit Button:**
  - Padding: `px-6 py-3`
  - Border radius: `rounded-lg`
  - Fixed width on desktop, full width on mobile
  - Icon: Optional rocket/sparkle icon from Heroicons

### 3. Video Display Container
**Conditional Rendering:** Only appears after successful generation

**Structure:**
```
[Video Container]
  - Margin top: mt-12
  - Video element:
    - Width: w-full max-w-2xl
    - Border radius: rounded-xl
    - Shadow: Large glow effect (shadow-2xl)
    - Border: 2px with semi-transparent treatment
    - Controls: Native HTML5 controls visible
    - Autoplay, loop enabled
```

### 4. Error State
- **Display:** Centered text below form
- **Spacing:** `mt-6`
- **Icon:** Optional alert icon from Heroicons
- **Text treatment:** Emphasized weight

---

## Responsive Behavior

**Mobile (default):**
- Stack form elements vertically
- Full-width input and button
- Video: 95vw max-width
- Title: Smaller scale

**Tablet/Desktop (md:):**
- Horizontal form layout
- Larger typography scale
- Video: Fixed max-width (32rem/512px)

---

## Interactive States

### Form Elements
- **Input Focus:** Ring effect, subtle scale
- **Button Hover:** Scale transform (1.05), cursor pointer
- **Button Active:** Scale transform (0.98)
- **Disabled State:** Reduced opacity (0.5), cursor not-allowed during generation

### Video Player
- **Loading State:** Spinner/skeleton before video loads
- **Play State:** Standard HTML5 controls
- **No animations:** Video container appears instantly (no fade-ins)

---

## Icons
**Library:** Heroicons (via CDN)  
**Usage:**
- Button icon: `SparklesIcon` or `PlayIcon`
- Error state: `ExclamationCircleIcon`
- Size: `w-5 h-5` inline with text

---

## Accessibility
- **Form Labels:** Hidden but present for screen readers
- **ARIA Labels:** All interactive elements properly labeled
- **Keyboard Navigation:** Full tab order through form
- **Focus Indicators:** Visible ring on all focusable elements
- **Video Controls:** Native HTML5 controls for accessibility

---

## Images
**No hero images required.** This is a focused application interface, not a marketing page. The generated video content IS the visual centerpiece.

---

## Key Quality Standards
1. **Single-Purpose Focus:** Everything serves the video generation workflow
2. **Immediate Clarity:** User knows exactly what to do upon landing
3. **Generous Spacing:** Not cramped—breathing room around all elements
4. **Polished Details:** Smooth transitions, proper focus states, professional finish
5. **Mobile-First:** Fully functional on all screen sizes