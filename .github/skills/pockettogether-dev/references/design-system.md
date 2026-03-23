# Design System Reference — "Dark Glass"

## Core Philosophy

**"Financial Clarity through Native Elegance."**
The visual metaphor is **"The Cockpit"**: dark, focused, with glowing gradient instruments.
Motion is feedback, not decoration. Hierarchy through light and depth, not color noise.

---

## 1. Color Palette (AUTHORITATIVE)

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#000000` | **All page bodies** — pure black, not gray-900 |
| `bg-surface` | `#1c1c1e` | Cards, modals, list containers |
| `border-subtle` | `white/5` | Glass card borders |

> ⚠️ **Critical**: Never use `bg-gray-900` (`#111827`) as a page background. Always `#000000`.

### Brand Gradients
| Name | Class | Hex Range |
|------|-------|-----------|
| **Primary Brand** | `from-blue-500 to-purple-600` | `#3B82F6` → `#9333EA` |
| **Secondary Brand** | `from-cyan-500 to-blue-500` | `#06B6D4` → `#3B82F6` |

> ❌ Never use `from-purple-600 to-pink-600` for primary CTA buttons. That's incorrect.

### Semantic Colors (text / icon)
| Meaning | Text class | Background |
|---------|-----------|------------|
| Income / Safe | `text-green-400` | `bg-green-500/20` |
| Expense / Debt | `text-red-400` | `bg-red-500/20` |
| Warning / Limit | `text-orange-400` | `bg-orange-500/20` |
| Info / Insight | `text-blue-400` | `bg-blue-500/20` |

---

## 2. The Glass Card (Core Rule)

Every widget, card, or container must use this exact pattern:

```tsx
className="bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5 rounded-3xl"
```

| Property | Value |
|----------|-------|
| Roundedness (container) | `rounded-3xl` |
| Roundedness (inner items) | `rounded-2xl` |
| Backdrop | `backdrop-blur-xl` |
| Border | `border border-white/5` |
| Depth | `shadow-2xl` or internal gradient glow |

> ❌ Never use solid `bg-[#18181b]` (zinc-900) without backdrop-blur — this removes the glass effect.

### The `.glass-panel` Utility

Defined in `frontend/app/globals.css`. Must resolve to:
```css
.glass-panel {
  @apply bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5;
}
```
Not `bg-gray-900/60`.

---

## 3. Typography

| Level | Class | Usage |
|-------|-------|-------|
| Display | `text-3xl font-bold` | Page titles |
| Heading | `text-lg font-bold` | Widget titles |
| Body | `text-sm text-gray-300` | Content text |
| Caption | `text-xs text-gray-500 uppercase font-bold tracking-wider` | Labels, metadata |
| Currency/Numbers | `font-mono` | **All** monetary values and figures |

- Font family: `font-sans` (Inter / system default — not Geist)
- No `font-family: Arial, Helvetica` overrides

---

## 4. Navigation

### Mobile
- **Bottom floating Island bar**: `bg-gray-900/95 backdrop-blur-2xl`
- Floating, rounded, does not span full width

### Desktop
- Left vertical sidebar or top sticky bar

### NativeHeader (Page Header)
- Contains: Avatar (gradient `from-blue-500 to-purple-600`) + Greeting/Title + Notification Bell
- **"No Double Headers"**: If a page has a generic top bar, hide it on mobile in favour of `NativeHeader`
- Avatar gradient must be `from-blue-500 to-purple-600` — not `from-purple-500 to-pink-600`

---

## 5. Forms & Inputs

```tsx
// Correct input styling
className="bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:border-blue-500"
```

❌ Not: `bg-gray-900 border-gray-700`

### Buttons
| Type | Class |
|------|-------|
| Primary CTA | `bg-gradient-to-r from-blue-500 to-purple-600` |
| Secondary | `bg-white/10 border border-white/10` |
| Destructive | `bg-red-500/20 text-red-400 border border-red-500/30` |

---

## 6. Lists (Inset Grouped — iOS Style)

```tsx
// Container
className="bg-[#1c1c1e] rounded-3xl overflow-hidden"

// List item (not last)
className="border-b border-white/5 px-4 py-3"

// Last item — no border
className="px-4 py-3"
```

---

## 7. Modals

```tsx
// Modal backdrop
className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"

// Modal container
className="bg-[#1c1c1e] border border-white/5 rounded-3xl p-6 shadow-2xl"
```

❌ Not: `bg-gray-800`

---

## 8. Motion (Framer Motion)

Always use presets from `frontend/lib/motion.ts`.

| Preset | Usage |
|--------|-------|
| `fadeInUp` | Page entry, element appearance (fade + slide up 20px) |
| `staggerContainer` | List containers (stagger children) |

```tsx
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { motion } from "framer-motion";

<motion.div variants={staggerContainer} initial="hidden" animate="show">
  <motion.div variants={fadeInUp}>...</motion.div>
</motion.div>
```

**Interactive cards**: always add `active:scale-[0.98]` for press feedback.

---

## 9. Icons (Lucide React)

```tsx
import { TrendingUp } from "lucide-react";

// Standard usage
<TrendingUp className="w-5 h-5" />        // standard action
<TrendingUp className="w-4 h-4" />        // tight/metadata spaces
```

- Stroke width: **2px** (default)
- No other icon libraries

---

## 10. Common Deviations to Fix

| Wrong | Correct |
|-------|---------|
| `bg-gray-900` (page bg) | `bg-black` or `#000000` |
| `bg-[#18181b]` (card, no blur) | `bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5` |
| `from-purple-600 to-pink-600` (button) | `from-blue-500 to-purple-600` |
| `bg-gray-900 border-gray-700` (input) | `bg-white/5 border-white/10` |
| `bg-gray-800` (modal) | `bg-[#1c1c1e]` |
| `from-violet-600 to-indigo-600` (stat card) | `from-blue-500 to-purple-600` |
| `from-purple-500 to-pink-600` (avatar) | `from-blue-500 to-purple-600` |
