# Design System Audit Report

**Date:** 2026-02-10
**Auditor:** Antigravity (Senior Quality Analyst)
**Status:** ⚠️ Partial Compliance (Significant Deviations Detected)

## 1. Executive Summary

The application demonstrates a strong adherence to the *structural* and *aesthetic* goals of the "PocketTogether" Design System, effectively implementing the "Dark Glass" and "Cockpit" metaphors. However, a strict audit reveals **systematic inconsistencies** in color tokens, glassmorphism implementation, and typography choices that deviate from the documented standards (`design_system.md`).

**Key Recommendation:** Refactor base configuration to align strictly with Design System tokens before expanding features to prevent design debt.

---

## 2. Global Style Deviations

| Category | Design System Spec | Current Implementation | Status |
| :--- | :--- | :--- | :--- |
| **Primary Background** | `#000000` (`bg-primary`) | `#111827` (`bg-gray-900`, via `app/globals.css`) | 🔴 **Critical Deviation** |
| **Surface Background** | `#1c1c1e` (`bg-surface`) | `#18181b` (`zinc-900`) or `gray-900` | 🟠 **Inconsistent** |
| **Typography** | Native System Font (Inter/Roboto) | `Geist` & `Geist_Mono` (Vercel Custom Fonts) | 🟡 **Minor Deviation** |
| **Font Family** | `font-sans` | `font-family: Arial, Helvetica...` (in `globals.css`) | 🟡 **Legacy Override** |

**Observation:** The application feels "blue/gray" (`gray-900`) rather than the "Deep Space" pure black (`#000000`) specified. This reduces the contrast and impact of the "glowing instruments" metaphor.

---

## 3. Component Audit

### 3.1. Navigation & Headers
*   **Navbar (Desktop):**
    *   ❌ Uses `bg-gray-900` instead of a transparent/glass or pure black finish.
    *   ✅ Mobile Bottom Nav follows the "Island" concept broadly but color tuning is off.
*   **NativeHeader:**
    *   ✅ Correctly implements Greeting + Avatar.
    *   ❌ **Missing Notification Bell**: The design system explicitly requires a "Notification Bell" in the NativeHeader (Section 4.2). It is absent in `NativeHeader.tsx`.
    *   ❌ Gradient Border: Uses `purple-500 to-pink-600` (Pink) instead of the Primary Brand `blue-500 to-purple-600` (Blue-Purple).

### 3.2. Cards & Glassmorphism
*   **The "Glass Card" Rule:** `bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5`
*   **Findings:**
    *   **TransactionCard:** Uses solid `bg-[#18181b]` (Zinc 900). **No Glass Effect.**
    *   **StatsRow (Small Cards):** Uses solid `bg-[#18181b]`. **No Glass Effect.**
    *   **RecentActivity (Empty State):** ✅ Correctly uses `bg-[#1c1c1e]/80 backdrop-blur-xl`.
    *   **BudgetWidget (Assumed):** Likely follows the pervasive `#18181b` pattern.

**Impact:** The UI lacks the intended "depth" and "bleed-through" of the Glassmorphism spec, appearing flatter and more opaque than designed.

### 3.3. Gradients
*   **Spec:** `from-blue-500 to-purple-600` (Primary Brand).
*   **Implementation:**
    *   `StatsRow` (Total Balance): `from-violet-600 to-indigo-600`.
    *   `Navbar` (Logo): `from-blue-500 to-purple-600` (✅ Compliant).
    *   `NativeHeader` (Avatar): `from-purple-500 to-pink-600` (❌ Inconsistent).

### 3.4. Modals & Forms (New Findings)
*   **Modals (`TransactionModal`, `CategoryModal`):**
    *   ❌ **Background**: Uses `bg-gray-800` (Solid Zinc) instead of `bg-surface` or `glass-panel`.
    *   ❌ **Primary Buttons**: Use `from-purple-600 to-pink-600` (Pink gradient). This deviates from the **Primary Brand** (`blue-500` to `purple-600`).
    *   ❌ **Inputs**: Use generic `bg-gray-900 border-gray-700`. These lack the "Glass Input" aesthetic (e.g., `bg-white/5 border-white/10`).
*   **Widgets (`BudgetWidget`):**
    *   ⚠️ **Background**: Uses `.glass-panel` utility, but because `.glass-panel` itself is incorrect (see Section 2), the widget appears too blue/gray (`gray-900/60`).
    *   ✅ **Progress Bar**: Uses `cyan-400 via-blue-500 to-purple-500`, which aligns well with the Secondary Brand.

---

## 4. Specific File Findings

### `app/globals.css`
*   **Line 5:** `--background: #111827;`
    *   *Fix:* Change to `--background: #000000;`
*   **Line 46:** `.glass-panel { @apply bg-gray-900/60 ... }`
    *   *Fix:* Update to `bg-[#1c1c1e]/80`.

### `components/TransactionCard.tsx`
*   **Line 58:** `bg-[#18181b]`
    *   *Fix:* Replace with `glass-panel` utility or compliant class string.
*   **Line 68:** `bg-white/5` (Icon Container) -> This is acceptable as "subtle glass".

### `components/dashboard/StatsRow.tsx`
*   **Line 17:** Gradient uses violet/indigo.
    *   *Fix:* Unify to Brand Primary (`blue-500` to `purple-600`) or document as a secondary variant.
*   **Line 35, 46, 57:** Cards use `bg-[#18181b]`.
    *   *Fix:* Apply Glass Card styling.

### `components/ui/SyncStatus.tsx`
*   **Line 68:** `bg-gray-900`
    *   *Fix:* Should be a `glass-panel` for consistency with Modals/Overlays.

### `components/TransactionModal.tsx` & `CategoryModal.tsx`
*   **Modal Container:** `bg-gray-800` (Lines 214, 86).
    *   *Fix:* Use `bg-[#1c1c1e]` or `glass-panel`.
*   **Buttons:** `from-purple-600 to-pink-600` (Lines 428, 211).
    *   *Fix:* Change to `from-blue-500 to-purple-600` to match brand identity.
*   **Inputs:** `bg-gray-900` (Lines 314, 126).
    *   *Fix:* Darken to `#000000` or use `bg-white/5` for better contrast against Surface.

---

## 5. Recommendations

1.  **Global Reset:** Update `tailwind.config.ts` and `globals.css` to strictly enforce the `#000000` background and `#1c1c1e` surface colors.
2.  **Glass Utility:** Refactor the `.glass-panel` class in `globals.css` to match the design system exactly (`bg-[#1c1c1e]/80 backdrop-blur-xl border border-white/5`) and apply it to **all** cards (TransactionCard, StatCards).
3.  **Font Alignment:** Decide whether to stick with Vercel's `Geist` (which is excellent but technically a deviation) or revert to system fonts. If keeping Geist, update the Design System document.
4.  **Header Fixes:** Add the missing Notification Bell to `NativeHeader` and fix the gradient colors to match the brand identity.

---
*End of Audit*
