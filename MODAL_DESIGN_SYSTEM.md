# ORINA MODAL DESIGN SYSTEM
**Version:** 1.0  
**Last Updated:** Feb 10, 2026  
**Status:** ✅ APPROVED - USE THIS AS STANDARD FOR ALL MODALS

---

## 📐 MODAL SIZE CATEGORIES

### Large Modal (Manage Asset Style)
- **Max Width:** `max-w-[95vw]`
- **Height:** `h-[90vh]`
- **Use Case:** Complex dashboards, multi-tab interfaces, data-heavy screens

### Medium Modal (Send Message Style) 
- **Max Width:** `max-w-lg` (512px)
- **Height:** Auto-height based on content
- **Use Case:** Forms, message composers, standard interactions

### Small Modal
- **Max Width:** `max-w-md` (448px)
- **Height:** Auto-height
- **Use Case:** Confirmations, alerts, quick actions

---

## 🎨 CORE DESIGN TOKENS

### Background & Overlay
```tsx
// Backdrop (ALL modals)
className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"

// Modal Container Background
className="bg-[#0f0f11]"  // Dark base - REQUIRED

// Section Backgrounds
className="bg-zinc-900/30"  // Headers, sidebars
className="bg-zinc-900/50"  // Input fields, secondary sections
```

### Borders
```tsx
// Primary Border (ALL modals)
border border-[#27272a]

// Dividers
border-b border-[#27272a]  // Horizontal
border-r border-[#27272a]  // Vertical
```

### Border Radius
```tsx
// Modal Container
rounded-xl  // 12px - STANDARD

// Buttons & Inputs
rounded-xl  // Primary actions
rounded-lg  // Secondary elements, close button
rounded-full  // Avatars, badges
```

### Shadows
```tsx
// Modal Container
shadow-2xl

// Primary Action Button
shadow-lg shadow-[#2CC295]/20  // Teal glow effect

// Avatar/Icon containers
shadow-lg  // When needed for depth
```

---

## 📦 MODAL STRUCTURE

### Standard Layout (Medium/Small Modals)

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="w-full max-w-lg bg-[#0f0f11] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden"
  >
    {/* HEADER */}
    <div className="p-6 border-b border-[#27272a] bg-zinc-900/30">
      {/* Header content */}
    </div>

    {/* BODY */}
    <div className="p-6 space-y-5">
      {/* Main content */}
    </div>
  </motion.div>
</div>
```

### Large Modal Layout

```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
  
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="relative w-full max-w-[95vw] h-[90vh] bg-[#0f0f11] rounded-xl shadow-2xl border border-[#27272a] overflow-hidden flex"
  >
    {/* Sidebar + Main Content layout */}
  </motion.div>
</div>
```

---

## 🎯 COMPONENT STANDARDS

### Header Section

```tsx
<div className="p-6 border-b border-[#27272a] bg-zinc-900/30">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      {/* Avatar/Icon */}
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold text-base shadow-lg">
        {/* Content */}
      </div>
      
      {/* Title & Subtitle */}
      <div>
        <h2 className="text-white font-bold text-sm">{title}</h2>
        <p className="text-[10px] text-zinc-500 font-mono">{subtitle}</p>
      </div>
    </div>
    
    {/* Close Button */}
    <button
      onClick={onClose}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
    >
      <X size={18} className="text-zinc-400" />
    </button>
  </div>
</div>
```

### Close Button (Large Modals)

```tsx
<button
  onClick={onClose}
  className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
>
  <X className="text-zinc-400" size={20} />
</button>
```

### Form Labels

```tsx
<label className="block text-[10px] font-bold text-zinc-500 mb-3 uppercase tracking-widest">
  Label Text
</label>
```

### Input Fields

```tsx
// Text Input
<input
  type="text"
  className="w-full px-4 py-3 bg-zinc-900/50 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295]/50 transition-all"
  placeholder="Enter text..."
/>

// Textarea
<textarea
  rows={6}
  className="w-full px-4 py-3 bg-zinc-900/50 border border-[#27272a] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295]/50 transition-all resize-none"
  placeholder="Enter text..."
/>
```

### Primary Action Button

```tsx
<button
  className="flex-1 px-6 py-3 bg-[#2CC295] hover:bg-[#25a882] text-black font-bold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#2CC295]/20"
>
  <Icon size={16} />
  Button Text
</button>
```

### Secondary Action Button

```tsx
<button
  className="p-3 bg-zinc-900/50 hover:bg-zinc-800 border border-[#27272a] text-white rounded-xl transition-colors"
  title="Tooltip"
>
  <Icon size={18} />
</button>
```

### Cancel Button

```tsx
<button
  className="px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800 border border-[#27272a] text-white font-bold text-sm rounded-xl transition-colors"
>
  Cancel
</button>
```

### Info/Tip Section

```tsx
<div className="flex items-start gap-3 p-4 bg-zinc-900/30 border border-[#27272a] rounded-lg">
  <Lightbulb size={14} className="text-[#2CC295] mt-0.5 flex-shrink-0" />
  <p className="text-[11px] text-zinc-400 leading-relaxed">
    <span className="text-zinc-300 font-bold">Quick Tip:</span> Your helpful message here.
  </p>
</div>
```

### Warning/Alert Section

```tsx
<div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
  <AlertCircle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
  <p className="text-[11px] text-yellow-200 leading-relaxed">
    <span className="text-yellow-100 font-bold">Warning:</span> Important information.
  </p>
</div>
```

### Error Section

```tsx
<div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
  <XCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
  <p className="text-[11px] text-red-200 leading-relaxed">
    <span className="text-red-100 font-bold">Error:</span> Error message.
  </p>
</div>
```

### Success State

```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-center py-8"
>
  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center">
    <CheckCircle size={32} className="text-[#2CC295]" />
  </div>
  <h3 className="text-white font-bold text-base mb-2">Success!</h3>
  <p className="text-sm text-zinc-400">Action completed successfully.</p>
</motion.div>
```

---

## 🎭 ANIMATIONS

### Modal Entry/Exit

```tsx
import { motion } from 'motion/react';

// Standard animation for medium/small modals
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  className="..."
>

// Animation for large modals
<motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
  transition={{ duration: 0.2 }}
  className="..."
>
```

### Content Transitions

```tsx
// Fade in from bottom
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
>

// Fade in only
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
>
```

---

## 🔤 TYPOGRAPHY SCALE

```tsx
// Modal Title (Large)
className="text-lg font-bold text-white tracking-tight"

// Modal Title (Medium/Small)
className="text-sm font-bold text-white"

// Section Title
className="text-sm font-bold text-white uppercase tracking-wider"

// Subtitle/Meta
className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5"

// Body Text
className="text-sm text-zinc-400"

// Small Text
className="text-xs text-zinc-400"

// Tiny Text (Labels, Hints)
className="text-[10px] text-zinc-500"

// Extra Tiny (Timestamps, Tags)
className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold"

// Wallet Address
className="text-[10px] text-zinc-500 font-mono"
```

---

## 🎨 AVATAR STANDARDS

### Default Avatar (No Image)

```tsx
// Standard Size (Medium Modals)
<div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold text-base shadow-lg">
  {name.charAt(0).toUpperCase()}
</div>

// Small Size
<div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold text-xs">
  {name.charAt(0).toUpperCase()}
</div>

// Large Size
<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] flex items-center justify-center text-white font-bold text-xl shadow-lg">
  {name.charAt(0).toUpperCase()}
</div>
```

### Avatar with Image

```tsx
<img
  src={avatarUrl}
  alt={name}
  className="w-11 h-11 rounded-full border-2 border-[#27272a]"
/>
```

---

## 📱 RESPONSIVE BEHAVIOR

### Padding Adjustments

```tsx
// Desktop padding
className="p-6"

// Responsive padding for large modals
className="p-4 md:p-6"
className="p-6 md:p-8"
```

### Modal Sizing

```tsx
// Container padding
className="p-4 md:p-6"

// Max width remains consistent
className="max-w-lg"  // Don't change on mobile
```

---

## ⚡ SPACING SYSTEM

```tsx
// Modal padding
p-6        // Standard padding for header/body

// Content spacing
space-y-5  // Between form sections
space-y-3  // Between related items
space-y-2  // Between tight elements

// Gaps
gap-3      // Standard gap between elements
gap-2      // Tight gap
gap-5      // Loose gap

// Margins
mb-3       // After labels
mb-2       // After small text
mt-0.5     // Tight spacing for subtitles
```

---

## 🔐 ACCESSIBILITY

### Required Attributes

```tsx
// Close button
<button
  onClick={onClose}
  aria-label="Close modal"
  className="..."
>

// Icon-only buttons
<button
  title="Descriptive tooltip"
  aria-label="Action description"
  className="..."
>

// Form inputs
<input
  id="inputId"
  aria-describedby="hintId"
  className="..."
/>

// Autofocus first input
<input autoFocus className="..." />
```

### Keyboard Support

```tsx
// Enter to submit
const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
};

// Escape to close
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

---

## 🎯 SPECIAL ELEMENTS

### Badge/Tag

```tsx
<span className="px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest bg-[#2CC295]/10 text-[#2CC295] border-[#2CC295]/20">
  Active
</span>
```

### Status Indicator

```tsx
<div className="flex items-center gap-1.5">
  <span className="w-1.5 h-1.5 bg-[#2CC295] rounded-full"></span>
  <span className="text-[10px] text-[#2CC295] uppercase font-bold tracking-widest">Online</span>
</div>
```

### Divider

```tsx
// Horizontal
<div className="border-t border-[#27272a]"></div>

// With text
<div className="flex items-center gap-3">
  <div className="flex-1 border-t border-[#27272a]"></div>
  <span className="text-xs text-zinc-500 uppercase tracking-wider">or</span>
  <div className="flex-1 border-t border-[#27272a]"></div>
</div>
```

---

## ✅ CHECKLIST FOR NEW MODALS

Before creating a new modal, ensure:

- [ ] Background is `bg-[#0f0f11]`
- [ ] Border is `border-[#27272a]`
- [ ] Border radius is `rounded-xl`
- [ ] Backdrop is `bg-black/80 backdrop-blur-sm`
- [ ] Header has `bg-zinc-900/30` background
- [ ] Close button uses standard 8x8 or 10x10 design
- [ ] Labels are `text-[10px]` uppercase with `tracking-widest`
- [ ] Input fields have focus ring: `focus:border-[#2CC295] focus:ring-1 focus:ring-[#2CC295]/50`
- [ ] Primary button has `shadow-lg shadow-[#2CC295]/20`
- [ ] Motion animations use `initial`, `animate`, `exit`
- [ ] Keyboard support (Enter, Escape) implemented
- [ ] Body scroll locked when modal open
- [ ] Responsive padding applied

---

## 📚 REFERENCE EXAMPLES

### Perfect Implementation Examples:
1. **`/src/app/components/seller-asset-management-modal.tsx`** - Large modal standard
2. **`/src/app/components/quick-message-modal.tsx`** - Medium modal standard

### When to Use Each Type:

**Large Modal:**
- Multi-tab interfaces
- Complex dashboards
- Asset management
- Analytics views

**Medium Modal:**
- Message composers
- Form submissions
- Profile editing
- Settings panels

**Small Modal:**
- Confirmations
- Simple alerts
- Quick actions
- Delete warnings

---

## 🎨 COLOR REFERENCE

```css
/* Primary Colors */
--orina-teal: #2CC295
--orina-teal-hover: #25a882
--orina-teal-dark: #1a9d6f

/* Backgrounds */
--modal-bg: #0f0f11
--header-bg: rgba(39, 39, 42, 0.3)  /* zinc-900/30 */
--input-bg: rgba(39, 39, 42, 0.5)   /* zinc-900/50 */

/* Borders */
--border-primary: #27272a

/* Text */
--text-primary: #ffffff
--text-secondary: #a1a1aa    /* zinc-400 */
--text-tertiary: #71717a     /* zinc-500 */
--text-muted: #52525b        /* zinc-600 */
--text-placeholder: #52525b  /* zinc-600 */
```

---

**END OF DOCUMENT**

*This design system is the source of truth for all modal designs in Orina.*  
*Last reviewed: Feb 10, 2026*  
*Approved by: Development Team*
