# Color Theme

A cohesive emerald to cyan neon color system for product UI, components, and branding.

---

## Core Brand

```css
--primary: #34D399;      /* emerald-400 */
--primary-glow: #22D3EE; /* cyan-400 */
```

Use for:
- Primary buttons
- Active states
- Focus accents
- Brand icon glow

---

## Dark Theme Foundation

```css
--background: #0B0F14;      /* deep blue-black */
--background-soft: #111827; /* gray-900 */
--surface: #1F2937;         /* gray-800 */
--surface-elevated: #273244;
```

Notes:
- Avoid pure black backgrounds to preserve glow contrast.
- Slight blue undertones keep the interface modern and readable.

---

## Neon Accent System

```css
--accent-1: #10B981; /* emerald-500 */
--accent-2: #06B6D4; /* cyan-500 */
--accent-3: #14B8A6; /* teal-500 */
```

Use for:
- Data visualizations
- Supporting highlights
- Decorative gradients

---

## Text Hierarchy

```css
--text-primary: #E5E7EB;   /* gray-200 */
--text-secondary: #9CA3AF; /* gray-400 */
--text-muted: #6B7280;     /* gray-500 */
```

---

## Borders and UI Details

```css
--border: #1F2937;
--border-glow: rgba(16, 185, 129, 0.4);
```

Optional glow border:

```css
box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
```

---

## Signature Gradient

```css
--gradient-primary: linear-gradient(
  135deg,
  #34D399 0%,
  #22D3EE 100%
);
```

Tailwind utility equivalent:

```tsx
bg-gradient-to-r from-emerald-400 to-cyan-400
```

---

## Glow Levels

Small glow, icon level:

```css
0 0 6px rgba(16, 185, 129, 0.9)
```

Medium glow, button level:

```css
0 0 12px rgba(16, 185, 129, 0.7)
```

Heavy glow, hero level:

```css
0 0 20px rgba(34, 211, 238, 0.6)
```

---

## Example Button

```tsx
<button
  className="
    px-4 py-2 rounded-lg
    bg-gradient-to-r from-emerald-400 to-cyan-400
    text-black font-semibold
    hover:scale-105 transition
    shadow-[0_0_10px_rgba(16,185,129,0.6)]
  "
>
  Run Analysis
</button>
```

---

## Common Mistakes to Avoid

- Using too many bright accent colors in one screen
- Using pure white backgrounds with neon glows
- Mixing warm accent families (orange and red) into this visual system

---

## Quick Token Set

```css
:root {
  --primary: #34D399;
  --primary-glow: #22D3EE;
  --background: #0B0F14;
  --background-soft: #111827;
  --surface: #1F2937;
  --surface-elevated: #273244;
  --accent-1: #10B981;
  --accent-2: #06B6D4;
  --accent-3: #14B8A6;
  --text-primary: #E5E7EB;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;
  --border: #1F2937;
  --border-glow: rgba(16, 185, 129, 0.4);
  --gradient-primary: linear-gradient(135deg, #34D399 0%, #22D3EE 100%);
}
```
