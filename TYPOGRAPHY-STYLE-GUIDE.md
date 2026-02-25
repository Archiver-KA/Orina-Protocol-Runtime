# 📐 TYPOGRAPHY SYSTEM v2.0 - Studio Pro Style Guide

**Based on HTML Template** | **Last Updated:** Feb 2026

---

## 🎯 Philosophy

This typography system is **1:1 mapped** to the original HTML template, using **Tailwind CSS default utilities** wherever possible to ensure consistency and maintainability.

---

## 📏 Font Scale (Tailwind-aligned)

| Size Class | Rem | Pixels | Usage in HTML Template |
|------------|-----|--------|------------------------|
| `text-[10px]` | 0.625rem | 10px | Micro labels (LIVE AUCTION, PRICE) |
| `text-[11px]` | 0.6875rem | 11px | Category badges (Abstract Realism) |
| `text-xs` | 0.75rem | 12px | Helper text, descriptions |
| `text-sm` | 0.875rem | 14px | Body text, card content, nav links |
| `text-base` | 1rem | 16px | Default base (rarely explicit) |
| `text-lg` | 1.125rem | 18px | Logo/Brand (STUDIO PRO) |
| `text-xl` | 1.25rem | 20px | Page headings (Featured Assets) |
| `text-2xl` | 1.5rem | 24px | Large metrics, statistics |
| `text-3xl` | 1.875rem | 30px | Hero headings |
| `text-4xl` | 2.25rem | 36px | Display headings |

---

## 🎨 HTML Template Patterns

### **1. Logo/Brand Text**
```html
<!-- HTML Template -->
<span class="text-lg font-bold tracking-tight text-white uppercase">Studio Pro</span>
```
**Usage:** 18px bold, uppercase, tight tracking

---

### **2. Page Headings**
```html
<!-- HTML Template -->
<h1 class="text-xl font-bold text-white">Featured Assets</h1>
```
**Usage:** 20px bold, white text

---

### **3. Navigation Links**
```html
<!-- HTML Template -->
<a class="text-sm font-medium">Marketplace</a>
```
**Usage:** 14px medium weight

---

### **4. Section Headers (Sidebar)**
```html
<!-- HTML Template -->
<label class="text-[11px] uppercase tracking-widest font-bold text-zinc-500">Categories</label>
```
**Custom Class:** `.text-section-label`
**Usage:** 11px, uppercase, tracking: 0.15em, bold

---

### **5. Category Badges**
```html
<!-- HTML Template -->
<p class="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Abstract Realism</p>
```
**Custom Class:** `.text-category-badge`
**Usage:** 11px, uppercase, tracking: 0.05em

---

### **6. Live Auction Badge**
```html
<!-- HTML Template -->
<span class="text-[10px] font-bold text-white uppercase tracking-tighter">Live Auction</span>
```
**Custom Class:** `.text-live-badge`
**Usage:** 10px, uppercase, tight tracking (-0.025em)

---

### **7. Price Labels**
```html
<!-- HTML Template -->
<p class="text-[10px] uppercase text-zinc-500 font-bold mb-0.5">Price</p>
```
**Custom Class:** `.text-price-label`
**Usage:** 10px, uppercase, tracking: 0.1em

---

### **8. Card Prices**
```html
<!-- HTML Template -->
<p class="text-sm font-bold text-white">2.45 ETH</p>
```
**Usage:** 14px bold

---

### **9. Helper Text**
```html
<!-- HTML Template -->
<p class="text-xs text-zinc-500 mt-1">Advanced attribute filters</p>
```
**Custom Class:** `.text-helper`
**Usage:** 12px, zinc-500 color

---

## 🔧 Custom Utility Classes

These classes extend Tailwind for specific Studio Pro patterns:

### `.text-micro`
```css
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.1em;
```
**Use:** Micro labels (LIVE AUCTION, PRICE)

---

### `.text-caption`
```css
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
```
**Use:** Category badges, small labels

---

### `.text-section-label`
```css
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.15em;
```
**Use:** Section headers (CURATION LAB, MARKET HEAT)

---

### `.text-brand`
```css
font-size: 18px;
font-weight: 700;
letter-spacing: -0.025em;
```
**Use:** Logo, brand text

---

### `.text-page-heading`
```css
font-size: 20px;
font-weight: 700;
line-height: 1.25;
```
**Use:** Page headings (Featured Assets, Analytics)

---

### `.text-card-title`
```css
font-weight: 700;
line-height: 1.4;
```
**Use:** Card titles (inherits parent font-size)

---

### `.text-helper`
```css
font-size: 12px;
color: #71717a;
line-height: 1.4;
```
**Use:** Helper text, descriptions

---

### `.text-category-badge`
```css
font-size: 11px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
```
**Use:** Category badges

---

### `.text-live-badge`
```css
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: -0.025em;
```
**Use:** Live auction badges

---

### `.text-price-label`
```css
font-size: 10px;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.1em;
color: #71717a;
```
**Use:** Price labels (PRICE, ETH)

---

## 📐 Font Weights

| Class | Value | HTML Usage |
|-------|-------|------------|
| `font-light` | 300 | Rare, special emphasis |
| `font-normal` | 400 | Default body text |
| `font-medium` | 500 | Nav links, buttons |
| `font-semibold` | 600 | Category badges |
| `font-bold` | 700 | Headings, prices, labels |

---

## 📏 Letter Spacing

| Class | Value | HTML Usage |
|-------|-------|------------|
| `tracking-tighter` | -0.025em | Logo, live badges |
| `tracking-normal` | 0 | Default |
| `tracking-wide` | 0.025em | Slightly spaced |
| `tracking-wider` | 0.05em | Category labels |
| `tracking-widest` | 0.1em | Micro labels (10px) |
| `tracking-[0.15em]` | 0.15em | Section headers |

---

## 🎯 Usage Examples

### ✅ Correct (matches HTML template)

```tsx
// Page heading
<h1 className="text-xl font-bold text-white">Featured Assets</h1>

// Section header
<label className="text-[11px] uppercase tracking-[0.15em] font-bold text-zinc-500">
  Categories
</label>

// Category badge
<p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
  Abstract Realism
</p>

// Price label
<p className="text-[10px] uppercase text-zinc-500 font-bold">Price</p>

// Price value
<p className="text-sm font-bold text-white">2.45 ETH</p>

// Helper text
<p className="text-xs text-zinc-500">Advanced attribute filters</p>

// Navigation link
<a className="text-sm font-medium text-zinc-500">Marketplace</a>

// Logo
<span className="text-lg font-bold tracking-tight text-white uppercase">
  Studio Pro
</span>
```

---

### ❌ Incorrect (don't use)

```tsx
// ❌ Don't use custom heading classes
<h1 className="text-heading-md">Featured Assets</h1>

// ❌ Don't use old .text-label
<p className="text-label">Price</p>

// ❌ Don't use .text-tiny
<span className="text-tiny">Live Auction</span>

// ❌ Don't use .text-body-sm
<p className="text-body-sm">Description</p>
```

**Use Tailwind defaults instead:**
- `text-xl font-bold` (not `.text-heading-md`)
- `text-xs` (not `.text-label`)
- `text-[10px]` (not `.text-tiny`)
- `text-sm` (not `.text-body-sm`)

---

## 🔄 Migration Guide

| Old Class | New Class | Notes |
|-----------|-----------|-------|
| `.text-heading-md` | `text-xl font-bold` | Page headings |
| `.text-label` | `text-xs font-medium` | Labels |
| `.text-tiny` | `text-[10px] font-bold uppercase tracking-widest` | Micro labels |
| `.text-body-sm` | `text-sm` | Body text |
| `.text-body-md` | `text-base` | Default text |
| `.text-h1` | `text-4xl font-bold` | Display headings |
| `.text-h2` | `text-3xl font-bold` | Hero headings |
| `.text-h3` | `text-2xl font-bold` | Section headings |

---

## 📚 Design Tokens Reference

All tokens are defined in `/src/styles/theme.css`:

```css
/* Font Sizes */
--font-size-tiny: 0.625rem;      /* 10px */
--font-size-caption: 0.6875rem;  /* 11px */
--font-size-xs: 0.75rem;         /* 12px */
--font-size-sm: 0.875rem;        /* 14px */
--font-size-base: 1rem;          /* 16px */
--font-size-lg: 1.125rem;        /* 18px */
--font-size-xl: 1.25rem;         /* 20px */
--font-size-2xl: 1.5rem;         /* 24px */
--font-size-3xl: 1.875rem;       /* 30px */
--font-size-4xl: 2.25rem;        /* 36px */

/* Font Weights */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Letter Spacing */
--tracking-tighter: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
--tracking-section: 0.15em;
```

---

## ✅ Checklist for New Components

- [ ] Use Tailwind defaults (`text-xl`, `text-sm`, etc.)
- [ ] Match font-weight from HTML template
- [ ] Apply correct letter-spacing for uppercase labels
- [ ] Use `.text-micro` for 10px labels
- [ ] Use `.text-section-label` for 11px section headers
- [ ] Never create custom font-size values
- [ ] Test against HTML template screenshots

---

## 🎯 Summary

**Prefer:** Tailwind default classes (`text-xl font-bold`)  
**Use custom classes only for:** Micro labels (10px), section headers (11px)  
**Never:** Create new custom font classes  
**Always:** Reference HTML template as source of truth

---

**Typography System v2.0** - Aligned with HTML Template ✅
