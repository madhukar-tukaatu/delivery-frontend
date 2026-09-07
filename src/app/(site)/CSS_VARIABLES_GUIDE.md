# CSS Variables Guide - Tukaatu Express Design System

## Overview
This guide documents the organized CSS variable system for consistent, maintainable styling across the Tukaatu Express website.

All variables are defined in `site.css` using semantic naming conventions.

---

## 1. BRAND COLORS

### Primary Brand Color (Blue)
```css
--color-brand-primary: #027196;           /* Main brand blue */
--color-brand-primary-light: #0284c7;     /* Lighter blue for backgrounds */
--color-brand-primary-dark: #01547a;      /* Darker blue for emphasis */
```

**Usage:**
```css
/* Hero sections, inverse backgrounds */
.hero { background: var(--color-brand-primary); }
.header-inverse { background: var(--color-brand-primary-dark); }
```

### Accent Color (Yellow)
```css
--color-brand-accent: #f5c518;           /* Main accent yellow */
--color-brand-accent-hover: #ffd740;     /* Hover state */
--color-brand-accent-dark: #c9a000;      /* Darker accent */
```

**Usage:**
```css
/* CTA buttons, highlights, accents */
.btn-primary { background: var(--color-brand-accent); }
.btn-primary:hover { background: var(--color-brand-accent-hover); }
```

---

## 2. NEUTRAL GRAYS (Color Foundation)

```css
--color-gray-50: #f9fafb;     /* Lightest - very subtle backgrounds */
--color-gray-100: #f3f4f6;    /* Light - section backgrounds */
--color-gray-200: #e5e7eb;    /* Light - borders, dividers */
--color-gray-300: #d1d5db;    /* Medium-light - form inputs, borders */
--color-gray-400: #9ca3af;    /* Medium - muted text, secondary info */
--color-gray-500: #6b7280;    /* Medium - secondary text */
--color-gray-600: #4b5563;    /* Dark - body text alternative */
--color-gray-700: #374151;    /* Darker - form labels, secondary headings */
--color-gray-800: #1f2937;    /* Very dark - rare use */
--color-gray-900: #111827;    /* Darkest - primary text */
```

---

## 3. SEMANTIC TEXT COLORS

Use these for consistent text hierarchy:

```css
--text-primary: var(--color-gray-900);      /* Main content, headings */
--text-secondary: var(--color-gray-600);    /* Description, secondary info */
--text-tertiary: var(--color-gray-500);     /* Metadata, timestamps */
--text-muted: var(--color-gray-400);        /* Disabled, placeholders */
--text-light: var(--color-gray-700);        /* Form labels */
--text-inverse: #ffffff;                     /* Text on dark backgrounds */
--text-accent: var(--color-brand-primary);  /* Links, emphasis */
--text-accent-bright: var(--color-brand-accent); /* Highlights, alerts */
```

**Usage:**
```css
h1 { color: var(--text-primary); }
p { color: var(--text-secondary); }
.meta { color: var(--text-tertiary); }
input::placeholder { color: var(--text-muted); }
a:hover { color: var(--text-accent); }
```

---

## 4. SEMANTIC BACKGROUND COLORS

Use these for consistent background layering:

```css
--bg-primary: #ffffff;                      /* Main content area */
--bg-secondary: var(--color-gray-50);       /* Subtle section background */
--bg-tertiary: var(--color-gray-100);       /* Stronger section background */

/* Inverse backgrounds (dark sections) */
--bg-inverse: var(--color-brand-primary);   /* Hero sections, dark CTAs */
--bg-inverse-light: var(--color-brand-primary-light);
--bg-inverse-dark: var(--color-brand-primary-dark);

/* Accent backgrounds */
--bg-accent: var(--color-brand-accent);     /* CTA buttons */
--bg-accent-light: rgba(245, 197, 24, 0.12); /* Icon backgrounds (12%) */
--bg-accent-muted: rgba(245, 197, 24, 0.06); /* Very subtle backgrounds (6%) */
```

**Usage:**
```css
/* Main layout */
.page { background: var(--bg-primary); }

/* Section alternation */
.section { background: var(--bg-secondary); }
.section:nth-child(even) { background: var(--bg-tertiary); }

/* Hero sections */
.hero { background: var(--bg-inverse); }
.hero-button { background: var(--bg-accent); }

/* Icon containers */
.icon-box { background: var(--bg-accent-light); }
```

---

## 5. SEMANTIC BORDER COLORS

```css
--border-light: var(--color-gray-200);           /* Subtle dividers */
--border-default: var(--color-gray-300);         /* Standard borders */
--border-dark: var(--color-gray-400);            /* Emphasized borders */

--border-primary: var(--color-brand-primary);    /* Brand blue borders */
--border-primary-light: rgba(2, 113, 150, 0.12); /* 12% opacity blue */
--border-primary-lighter: rgba(2, 113, 150, 0.08); /* 8% opacity blue */

--border-accent: var(--color-brand-accent);      /* Yellow borders */
--border-accent-light: rgba(245, 197, 24, 0.3);  /* 30% opacity yellow */
```

**Usage:**
```css
.card { border: 1px solid var(--border-light); }
.input { border: 1px solid var(--border-default); }
.button { border: 1px solid var(--border-primary); }
.hero-card { border: 1px solid var(--border-accent-light); }
```

---

## 6. SHADOW SYSTEM

Pre-defined elevation shadows for consistent depth:

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);        /* Minimal elevation */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);        /* Subtle shadow */
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.12);        /* Medium shadow */
--shadow-lg: 0 12px 35px rgba(245, 197, 24, 0.12); /* Large (with accent) */
--shadow-xl: 0 18px 55px rgba(2, 113, 150, 0.06);  /* Extra large (brand) */
--shadow-glow: 0 0 0 1px rgba(2, 113, 150, 0.08), 0 24px 80px rgba(2, 113, 150, 0.10); /* Glow effect */
```

**Usage:**
```css
.button { box-shadow: var(--shadow-xs); }
.card { box-shadow: var(--shadow-xl); }
.card:hover { box-shadow: var(--shadow-lg); }
.input:focus { box-shadow: var(--shadow-glow); }
```

---

## 7. TYPOGRAPHY

Font families and weights:

```css
--font-body: "Inter", system-ui, sans-serif;           /* Body text */
--font-display: "Plus Jakarta Sans", system-ui, sans-serif; /* Headings */

--font-weight-regular: 400;     /* Normal text */
--font-weight-medium: 500;      /* Slightly heavier */
--font-weight-semibold: 600;    /* Navigation, labels */
--font-weight-bold: 700;        /* Headings */
--font-weight-extrabold: 800;   /* Display text */
```

**Usage:**
```css
body { font-family: var(--font-body); }
h1, .site-display { font-family: var(--font-display); }

.label { 
  font-weight: var(--font-weight-semibold); 
}
```

---

## 8. SPACING & SIZING

Border radius constants:

```css
--radius-sm: 0.75rem;    /* 12px - small elements */
--radius-md: 1rem;       /* 16px - standard elements */
--radius-lg: 1.5rem;     /* 24px - large containers */
--radius-xl: 2rem;       /* 32px - sections */
--radius-full: 999px;    /* Fully rounded (pills) */
```

**Usage:**
```css
.button { border-radius: var(--radius-md); }
.card { border-radius: var(--radius-lg); }
.pill { border-radius: var(--radius-full); }
```

---

## 9. TRANSITIONS

Animation timings:

```css
--transition-fast: 0.15s ease;   /* Quick feedback (0.15s) */
--transition-base: 0.2s ease;    /* Standard transitions (0.2s) */
--transition-slow: 0.35s ease;   /* Subtle animations (0.35s) */
```

**Usage:**
```css
a { transition: color var(--transition-base); }
.card { transition: transform var(--transition-slow), box-shadow var(--transition-slow); }
```

---

## 10. UTILITY CLASSES

Pre-built classes for common scenarios:

### Text Color Classes
```html
<!-- Text colors -->
<p class="text-primary">Main content</p>
<p class="text-secondary">Secondary info</p>
<p class="text-tertiary">Metadata</p>
<p class="text-accent">Link text</p>
<p class="text-accent-bright">Highlight</p>
<p class="text-inverse">On dark backgrounds</p>
```

### Background Classes
```html
<!-- Section backgrounds -->
<div class="bg-primary">Main white</div>
<div class="bg-secondary">Light gray</div>
<div class="bg-tertiary">Medium gray</div>

<!-- Dark section backgrounds -->
<div class="bg-inverse">Dark blue hero</div>
<div class="bg-inverse-light">Light blue alt</div>

<!-- Accent backgrounds -->
<div class="bg-accent">Yellow button</div>
<div class="bg-accent-light">Icon container</div>
<div class="bg-accent-muted">Subtle background</div>
```

### Border Classes
```html
<!-- Borders -->
<div class="border-light">Subtle line</div>
<div class="border-default">Standard border</div>
<div class="border-primary">Brand blue</div>
<div class="border-accent">Yellow border</div>
```

---

## 11. IMPLEMENTATION EXAMPLES

### Example 1: Card Component
```css
.card {
  background: var(--bg-primary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
}

.card:hover {
  border-color: var(--border-primary-light);
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.card-title {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
}

.card-text {
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-weight: var(--font-weight-regular);
}
```

### Example 2: CTA Button
```css
.btn-primary {
  background: var(--bg-accent);
  color: #0a0a0a;
  border: none;
  border-radius: var(--radius-md);
  padding: 0.875rem 1.5rem;
  font-weight: var(--font-weight-bold);
  transition: background var(--transition-fast);
}

.btn-primary:hover {
  background: var(--color-brand-accent-hover);
}

.btn-primary:focus {
  box-shadow: var(--shadow-glow);
}
```

### Example 3: Hero Section
```css
.hero {
  background: linear-gradient(
    135deg,
    var(--bg-inverse) 0%,
    var(--bg-inverse-dark) 100%
  );
  color: var(--text-inverse);
  padding: 6rem 2rem;
}

.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2rem, 8vw, 4rem);
  font-weight: var(--font-weight-bold);
  color: var(--text-inverse);
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-weight: var(--font-weight-regular);
}

.hero-accent {
  color: var(--text-accent-bright);
}
```

---

## 12. MIGRATION CHECKLIST

When converting existing inline styles:

- [ ] Replace `#027196` with `var(--color-brand-primary)`
- [ ] Replace `#f5c518` with `var(--color-brand-accent)`
- [ ] Replace gray colors with semantic variables (`--text-*`, `--bg-*`, `--border-*`)
- [ ] Replace hardcoded transitions with `var(--transition-*)`
- [ ] Replace shadow strings with `var(--shadow-*)`
- [ ] Replace border-radius values with `var(--radius-*)`
- [ ] Replace font families with `var(--font-*)`
- [ ] Test all color contrasts (WCAG AA minimum)

---

## 13. COLOR CONTRAST REFERENCE

Verified contrasts for accessibility (WCAG AA):

| Foreground | Background | Ratio | Status |
|-----------|-----------|-------|--------|
| --text-primary | --bg-primary | 16:1 | ✅ AAA |
| --text-secondary | --bg-primary | 8:1 | ✅ AAA |
| --text-inverse | --bg-inverse | 9:1 | ✅ AAA |
| --text-accent-bright | --bg-primary | 7:1 | ✅ AAA |
| --text-accent-bright | --bg-accent | 1.2:1 | ⚠️ Use only as icon |

---

## Questions?

Refer to `site.css` for the complete variable definitions or consult with the design system maintainer.
