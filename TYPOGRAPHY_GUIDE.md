# Typography System Guide

## 📖 Overview
This document describes the complete typography system implemented in the Web3 Analytics Dashboard, based on the Style Guide (Section 02).

---

## 🎯 Quick Reference

### Custom CSS Classes (Recommended)
```tsx
<h1 className="text-h1 text-white">Main Title</h1>
<h2 className="text-h2 text-white">Section Title</h2>
<p className="text-body-md text-zinc-300">Body text</p>
<span className="text-label text-zinc-400">Label</span>
<span className="text-tiny text-[#2CC295]">STATUS BADGE</span>
```

### Tailwind Utilities (Alternative)
```tsx
<h1 className="text-6xl font-bold text-white tracking-tight">Main Title</h1>
<h2 className="text-5xl font-bold text-white tracking-tight">Section Title</h2>
<p className="text-base text-zinc-300 leading-relaxed">Body text</p>
<span className="text-xs font-medium text-zinc-400">Label</span>
<span className="text-[10px] font-bold uppercase tracking-widest text-[#2CC295]">STATUS BADGE</span>
```

---

## 📐 Typography Scale

### Headings

| Class | Tailwind Equivalent | Size | Weight | Tracking | Line Height | Usage |
|-------|---------------------|------|--------|----------|-------------|-------|
| `.text-h1` | `text-6xl font-bold tracking-tight` | 60px | 700 | -0.025em | 1.25 | Page titles |
| `.text-h2` | `text-5xl font-bold tracking-tight` | 48px | 700 | -0.025em | 1.25 | Section titles |
| `.text-h3` | `text-4xl font-bold tracking-tight` | 36px | 700 | -0.025em | 1.25 | Card titles |
| `.text-h4` | `text-3xl font-bold tracking-tight` | 30px | 700 | -0.025em | 1.5 | Subheadings |
| `.text-h5` | `text-2xl font-bold` | 24px | 700 | Normal | 1.5 | Small headings |
| `.text-h6` | `text-xl font-bold` | 20px | 700 | Normal | 1.5 | Micro headings |

### Body Text

| Class | Tailwind Equivalent | Size | Weight | Line Height | Usage |
|-------|---------------------|------|--------|-------------|-------|
| `.text-body-lg` | `text-lg leading-relaxed` | 18px | 400 | 1.625 | Large body text |
| `.text-body-md` | `text-base leading-relaxed` | 16px | 400 | 1.625 | Default body text |
| `.text-body-sm` | `text-sm leading-relaxed` | 14px | 400 | 1.625 | Small body text |

### Labels & Micro

| Class | Tailwind Equivalent | Size | Weight | Special | Usage |
|-------|---------------------|------|--------|---------|-------|
| `.text-label` | `text-xs font-medium` | 12px | 500 | - | Form labels |
| `.text-caption` | `text-[11px]` | 11px | 400 | Line-height 1.375 | Captions |
| `.text-tiny` | `text-[10px] font-bold uppercase tracking-widest` | 10px | 700 | Uppercase + 0.1em | Status badges |
| `.text-section-header` | `text-[10px] font-bold uppercase tracking-[0.2em]` | 10px | 700 | Uppercase + 0.2em | Section headers |

---

## 🎨 Font Weights

| Weight | Value | Tailwind | Usage |
|--------|-------|----------|-------|
| Light | 300 | `font-light` | Decorative text |
| Regular | 400 | `font-normal` | Body text (default) |
| Medium | 500 | `font-medium` | Labels, emphasis |
| Semibold | 600 | `font-semibold` | Subheadings |
| Bold | 700 | `font-bold` | Headings, CTAs |

---

## 📏 Line Heights

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| Tight | 1.25 | `leading-tight` | Large headings |
| Snug | 1.375 | `leading-snug` | Subheadings |
| Normal | 1.5 | `leading-normal` | Default |
| Relaxed | 1.625 | `leading-relaxed` | Body text (recommended) |
| Loose | 2 | `leading-loose` | Special emphasis |

---

## 🔤 Letter Spacing (Tracking)

| Name | Value | Tailwind | Usage |
|------|-------|----------|-------|
| Tight | -0.025em | `tracking-tight` | Large headings |
| Normal | 0 | `tracking-normal` | Body text |
| Wide | 0.025em | `tracking-wide` | Buttons |
| Wider | 0.05em | `tracking-wider` | Small labels |
| Widest | 0.1em | `tracking-widest` | Uppercase micro |
| Section | 0.2em | `tracking-[0.2em]` | Section headers |

---

## 💡 Usage Examples

### Page Header
```tsx
<div className="space-y-2">
  <h1 className="text-h1 text-white">Web3 Analytics Dashboard</h1>
  <p className="text-body-md text-zinc-400">Real-time marketplace insights</p>
</div>
```

### Section Header
```tsx
<div className="space-y-4">
  <h2 className="text-section-header text-[#2CC295]">Market Overview</h2>
  <h3 className="text-h3 text-white">Market Statistics</h3>
</div>
```

### Card Content
```tsx
<div className="glass-card p-6 space-y-3">
  <h4 className="text-h6 text-white">Asset Details</h4>
  <p className="text-body-sm text-zinc-300">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  </p>
  <span className="text-label text-zinc-500">Last updated: 2 hours ago</span>
</div>
```

### Form Label
```tsx
<div className="space-y-2">
  <label className="text-label text-zinc-400">Collection Name</label>
  <input 
    type="text" 
    className="text-body-md text-white bg-zinc-900 border-zinc-700"
  />
</div>
```

### Status Badge
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 bg-[#2CC295]/10 border border-[#2CC295]/20 rounded-full">
  <div className="w-1.5 h-1.5 rounded-full bg-[#2CC295]"></div>
  <span className="text-tiny text-[#2CC295]">Success</span>
</div>
```

### Wallet Address
```tsx
<span className="text-label font-mono text-[#2CC295]">
  0x71C7...976F
</span>
```

### Section Header with Icon
```tsx
<div className="flex items-center gap-2">
  <span className="material-symbols-outlined text-[#2CC295] text-base">token</span>
  <h3 className="text-section-header text-zinc-500">Recent Transactions</h3>
</div>
```

---

## 🎨 Color Combinations

### Primary Text Colors
- **White (Primary):** `text-white` - Main headings, important text
- **Zinc-300:** `text-zinc-300` - Body text, readable content
- **Zinc-400:** `text-zinc-400` - Secondary text, descriptions
- **Zinc-500:** `text-zinc-500` - Subtle labels, metadata
- **Zinc-600:** `text-zinc-600` - Disabled text

### Accent Colors
- **Teal (Primary):** `text-[#2CC295]` - Links, wallet addresses, success
- **Purple:** `text-purple-400` - Special accents
- **Orange:** `text-orange-500` - Warnings
- **Red:** `text-red-500` - Errors
- **Yellow:** `text-yellow-500` - Pending states

### Monospace (Code/Addresses)
```tsx
<code className="text-xs font-mono text-[#2CC295]">0x71C7656EC7ab88b098defB751B7401B5f6d8976F</code>
```

---

## ⚡ Performance Tips

1. **Use custom classes for consistency:**
   ```tsx
   // ✅ Good
   <h1 className="text-h1 text-white">Title</h1>
   
   // ❌ Avoid (harder to maintain)
   <h1 className="text-6xl font-bold tracking-tight leading-tight text-white">Title</h1>
   ```

2. **Combine with color utilities:**
   ```tsx
   <p className="text-body-md text-zinc-300">Content</p>
   ```

3. **Override when needed:**
   ```tsx
   <h2 className="text-h2 text-white md:text-h1">Responsive Title</h2>
   ```

---

## 📝 CSS Variables

All typography values are stored as CSS variables in `:root`:

```css
/* Heading Scale */
--font-size-h1: 3.75rem; /* 60px */
--font-size-h2: 3rem;    /* 48px */
--font-size-h3: 2.25rem; /* 36px */
--font-size-h4: 1.875rem; /* 30px */
--font-size-h5: 1.5rem;  /* 24px */
--font-size-h6: 1.25rem; /* 20px */

/* Body Text */
--font-size-body-lg: 1.125rem; /* 18px */
--font-size-body-md: 1rem;     /* 16px */
--font-size-body-sm: 0.875rem; /* 14px */

/* Labels & Micro */
--font-size-label: 0.75rem;    /* 12px */
--font-size-caption: 0.6875rem; /* 11px */
--font-size-tiny: 0.625rem;    /* 10px */

/* Font Weights */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.25;
--line-height-snug: 1.375;
--line-height-normal: 1.5;
--line-height-relaxed: 1.625;
--line-height-loose: 2;

/* Letter Spacing */
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
--tracking-section: 0.2em;
```

---

## 🔄 Migration Guide

### Before (Inconsistent)
```tsx
<h1 className="text-4xl font-semibold text-white">Title</h1>
<p className="text-sm text-gray-400">Description</p>
<span className="text-xs uppercase tracking-wide text-teal-500">STATUS</span>
```

### After (Style Guide Compliant)
```tsx
<h1 className="text-h1 text-white">Title</h1>
<p className="text-body-sm text-zinc-400">Description</p>
<span className="text-tiny text-[#2CC295]">STATUS</span>
```

---

## 📦 Implementation Files

- **CSS Variables:** `/src/styles/theme.css` (lines 44-96)
- **Utility Classes:** `/src/styles/theme.css` (bottom section)
- **Style Guide Component:** `/src/app/components/TypographySection.tsx`
- **Style Guide Page:** `/src/app/pages/StyleGuide.tsx`

---

## ✅ Best Practices

1. ✅ **Use semantic classes:** `.text-h1`, `.text-body-md`, `.text-label`
2. ✅ **Maintain consistent spacing:** Use Tailwind's `space-y-*` utilities
3. ✅ **Apply proper color contrast:** White for headings, zinc-300/400 for body
4. ✅ **Use monospace for code/addresses:** `font-mono` class
5. ✅ **Add tracking for uppercase text:** `.text-tiny` or `tracking-widest`
6. ✅ **Test responsive typography:** Add `md:` and `lg:` breakpoint variants
7. ✅ **Keep line lengths readable:** Max 65-75 characters per line

---

## 🎯 Component Examples

See **`/src/app/pages/StyleGuide.tsx`** section **"02. TYPOGRAPHY SYSTEM"** for live examples of all typography styles.

---

Last updated: 2024-12-07
