---
name: ui-ux-design
description: Design system guidelines, color tokens, typography, component styling, mobile usability, and visual hierarchy for the SocietyClean application.
---

# UI/UX Design System Skill (`ui-ux-design`)

Use this skill when designing or styling user interfaces, cards, navigation, forms, dashboards, and responsive components for SocietyClean.

---

## 1. Brand Identity & Visual Language

SocietyClean is an eco-centric, institutional, and modern residential management SaaS platform.
The interface must evoke:
- **Cleanliness & Hygiene:** Fresh, restrained greens, immaculate whites, and subtle cool grays.
- **Civic Trust & Authority:** Deep evergreen headers and crisp typography that feel dependable to housing committee members.
- **Speed & Simplicity:** High-contrast buttons, immediate visual feedback, and zero clutter.

---

## 2. Color Palette Tokens

Always use these tokens; never introduce ad-hoc HEX values:

```css
:root {
  /* Brand Primary Greens */
  --color-primary-900: #081c15; /* Deep evergreen header text */
  --color-primary-800: #1b4332; /* Primary brand forest green */
  --color-primary-700: #2d6a4f; /* Primary buttons / active links */
  --color-primary-600: #40916c; /* Hover states */
  --color-primary-500: #52b788; /* Fresh mint accent / badges */
  --color-primary-100: #d8f3dc; /* Soft green badge backgrounds */
  --color-primary-50:  #f0fdf4; /* Light tint for active card surfaces */

  /* Neutral Surface & Grayscale */
  --color-neutral-900: #0f172a; /* Main body text */
  --color-neutral-700: #334155; /* Secondary text */
  --color-neutral-500: #64748b; /* Captions & input helper text */
  --color-neutral-300: #cbd5e1; /* Borders & subtle lines */
  --color-neutral-200: #e2e8f0; /* Card borders & table dividers */
  --color-neutral-100: #f8fafc; /* Page backgrounds */
  --color-neutral-0:   #ffffff; /* Surface white */

  /* Semantic Status Indicators */
  --color-status-pending:   #f59e0b; /* Amber */
  --color-status-progress:  #3b82f6; /* Blue */
  --color-status-resolved:  #10b981; /* Emerald green */
  --color-status-cancelled: #6b7280; /* Neutral gray */
  --color-status-reopened:  #ef4444; /* Crimson */

  /* Spacing & Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  --shadow-card:   0 4px 12px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
}
```

---

## 3. Typography & Text Hierarchy

- **Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- **Code & Reference IDs:** `'JetBrains Mono', 'Fira Code', monospace`.
- **Headings:**
  - `H1` (Page Title): `28px` (Mobile) / `32px` (Desktop), Weight `700`, Color `--color-primary-900`.
  - `H2` (Section Title): `20px` (Mobile) / `24px` (Desktop), Weight `600`, Color `--color-neutral-900`.
  - `H3` (Card Title): `16px`, Weight `600`.
  - Body Text: `14px` (Mobile) / `15px` (Desktop), Line-height `1.5`, Color `--color-neutral-900`.
  - Captions & Meta: `12px`, Line-height `1.4`, Color `--color-neutral-500`.

---

## 4. UI Component Patterns

### 4.1. Status Badges
Status badges must be compact pills with high contrast:
- `PENDING`: Background `#fef3c7`, Text `#92400e`, Border `1px solid #fde68a`.
- `IN_PROGRESS`: Background `#dbeafe`, Text `#1e40af`, Border `1px solid #bfdbfe`.
- `RESOLVED`: Background `#d1fae5`, Text `#065f46`, Border `1px solid #a7f3d0`.
- `REOPENED`: Background `#fee2e2`, Text `#991b1b`, Border `1px solid #fecaca`.

### 4.2. Complaint Stepper
Displays a 3-step timeline progression:
1. **Reported:** Circle with checkmark, date/time below.
2. **Assigned & In Progress:** Connected line, worker name.
3. **Resolved:** Green checkmark, resolution time & "View After Photo" button.

### 4.3. Touch & Usability Guidelines
- All interactive buttons and inputs must have a touch target of at least $44 \times 44\text{px}$.
- Floating CTA button on mobile: "Report Waste Issue" fixed in the bottom-right corner or center of the bottom navigation bar.
