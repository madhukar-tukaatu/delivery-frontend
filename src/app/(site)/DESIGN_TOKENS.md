# Design Tokens - Quick Reference

## 🎨 Colors at a Glance

### Brand
- **Primary (Blue)**: `--color-brand-primary` → #027196
- **Accent (Yellow)**: `--color-brand-accent` → #f5c518

### Text (Semantic Use)
```
--text-primary          → Main content, headings
--text-secondary        → Body text, descriptions
--text-tertiary         → Metadata, secondary info
--text-muted            → Disabled, placeholders
--text-accent           → Links, interactive
--text-accent-bright    → Highlights, alerts
--text-inverse          → On dark backgrounds
```

### Backgrounds (Semantic Use)
```
--bg-primary            → Main white areas
--bg-secondary          → Subtle sections
--bg-tertiary           → Medium emphasis
--bg-inverse            → Dark blue sections
--bg-accent             → CTA buttons, highlights
--bg-accent-light       → Icon backgrounds
--bg-accent-muted       → Subtle backgrounds
```

### Borders
```
--border-light          → Subtle dividers
--border-default        → Standard borders
--border-primary        → Brand blue borders
--border-accent         → Yellow accents
```

---

## 📝 Typography

```css
/* Font Families */
font-family: var(--font-body);      /* Inter */
font-family: var(--font-display);   /* Plus Jakarta Sans */

/* Font Weights */
font-weight: var(--font-weight-regular);    /* 400 */
font-weight: var(--font-weight-semibold);   /* 600 */
font-weight: var(--font-weight-bold);       /* 700 */
font-weight: var(--font-weight-extrabold);  /* 800 */
```

---

## 🎭 Shadows

```css
box-shadow: var(--shadow-xs);    /* Minimal */
box-shadow: var(--shadow-sm);    /* Subtle */
box-shadow: var(--shadow-md);    /* Medium */
box-shadow: var(--shadow-lg);    /* Large with accent */
box-shadow: var(--shadow-xl);    /* Extra large */
box-shadow: var(--shadow-glow);  /* Glow effect */
```

---

## ⏱️ Transitions

```css
transition: color var(--transition-fast);       /* 0.15s */
transition: all var(--transition-base);         /* 0.2s */
transition: transform var(--transition-slow);   /* 0.35s */
```

---

## 🔲 Spacing

```css
border-radius: var(--radius-sm);   /* 12px */
border-radius: var(--radius-md);   /* 16px */
border-radius: var(--radius-lg);   /* 24px */
border-radius: var(--radius-xl);   /* 32px */
border-radius: var(--radius-full); /* Fully rounded */
```

---

## 🚀 Quick Patterns

### Hero Section
```html
<section class="bg-inverse text-inverse">
  <h1 class="site-display">Title</h1>
  <p>Subtitle</p>
  <button class="bg-accent">CTA</button>
</section>
```

### Card Component
```html
<div class="bg-primary border-light" style="box-shadow: var(--shadow-sm); border-radius: var(--radius-lg);">
  <h3 class="text-primary site-display">Title</h3>
  <p class="text-secondary">Description</p>
</div>
```

### Button
```html
<button class="bg-accent text-primary font-weight-bold" style="border-radius: var(--radius-md);">
  Click me
</button>
```

### Form Input
```html
<input 
  class="bg-primary border-default text-primary"
  style="border-radius: var(--radius-md); border: 1px solid var(--border-default);"
  placeholder="Placeholder text"
/>
```

---

## ✅ Common Use Cases

| Component | Background | Text | Border | Shadow |
|-----------|-----------|------|--------|--------|
| Hero Section | `--bg-inverse` | `--text-inverse` | - | `--shadow-glow` |
| Card | `--bg-primary` | `--text-primary` | `--border-light` | `--shadow-sm` |
| Button (Primary) | `--bg-accent` | Primary | - | `--shadow-xs` |
| Button (Secondary) | `--bg-secondary` | `--text-primary` | `--border-primary` | - |
| Section Alt | `--bg-secondary` | `--text-primary` | - | - |
| Input | `--bg-primary` | `--text-primary` | `--border-default` | - |
| Input Focus | `--bg-primary` | `--text-accent` | `--border-primary` | `--shadow-glow` |
| Icon Container | `--bg-accent-light` | `--text-accent` | - | - |
| Badge | `--bg-accent-muted` | `--text-accent` | - | - |

---

## 🎯 Decision Tree

**What background should I use?**
- Main content area? → `--bg-primary`
- Section break (light)? → `--bg-secondary`
- Section break (stronger)? → `--bg-tertiary`
- Dark hero section? → `--bg-inverse`
- CTA button? → `--bg-accent`

**What text color should I use?**
- Main heading/content? → `--text-primary`
- Body text/description? → `--text-secondary`
- Metadata/timestamp? → `--text-tertiary`
- Disabled/placeholder? → `--text-muted`
- Link or interactive? → `--text-accent`
- On dark background? → `--text-inverse`

**What shadow should I use?**
- No elevation? → `none`
- Subtle hover? → `--shadow-xs`
- Card/default? → `--shadow-sm`
- Focus state? → `--shadow-glow`
- Elevated card? → `--shadow-xl`

---

## 📚 Files

- **Definition**: `site.css` (all variables defined)
- **Guide**: `CSS_VARIABLES_GUIDE.md` (detailed examples)
- **Examples**: See this file (quick reference)
