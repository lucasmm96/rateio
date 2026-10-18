---
name: Modern Financial Balance
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a40'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a70'
  outline-variant: '#bccabe'
  surface-tint: '#006d41'
  primary: '#006d41'
  on-primary: '#ffffff'
  primary-container: '#00a868'
  on-primary-container: '#00331c'
  inverse-primary: '#59de98'
  secondary: '#006c47'
  on-secondary: '#ffffff'
  secondary-container: '#8af5be'
  on-secondary-container: '#00714b'
  tertiary: '#52625c'
  on-tertiary: '#ffffff'
  tertiary-container: '#869690'
  on-tertiary-container: '#202e2a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#78fbb2'
  primary-fixed-dim: '#59de98'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#005230'
  secondary-fixed: '#8df7c1'
  secondary-fixed-dim: '#71dba6'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#d5e6df'
  tertiary-fixed-dim: '#bacac4'
  on-tertiary-fixed: '#101e1a'
  on-tertiary-fixed-variant: '#3b4a45'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  currency-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  currency-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a welcoming, clear, and reassuring fintech environment built around the social friction of splitting expenses. Financial conversations often carry subconscious tension; this design language defuses that anxiety through generous whitespace, warm transitions, and unambiguous legibility inspired by modern digital banking.

The visual tone merges **Corporate Modern** with friendly, human-centric nuances:
- **Atmosphere:** Clean, transparent, and approachable, avoiding aggressive corporate rigidity while retaining absolute monetary precision.
- **Visual Mechanics:** Subtle ambient depth, soft-tinted surfaces for states, and deliberate distinction between neutral context and critical financial statuses (Receivable, Due, Projected).
- **Target Experience:** Optimized primarily as a mobile-first PWA (standard 390×844 viewport), delivering native app tactile response, clean affordances, and zero layout shift during monetary input.

## Colors

The palette uses a balanced emerald green as the anchor for financial trust and settling debts, supported by precise semantic indicators designed to immediately clarify financial status.

### Color Tokens & Semantic Roles

#### Light Mode (Default)
- **Primary / Brand:** `#00A868` (Active states, key actions, settled balances)
- **Primary Interactive / Hover:** `#00875A` (Pressed states, high-contrast actions)
- **Primary Container / Soft:** `#E6F7F0` (Positive balance chips, active filter containers)
- **Success / Receivable ("A Receber"):** `#00A868`
- **Critical / Payable ("Deve"):** `#DC2626`
- **Warning / Projected ("Prevista"):** `#D97706`
- **Text Primary:** `#0F172A` (Headlines, balance figures, high emphasis)
- **Text Secondary:** `#64748B` (Labels, timestamps, supporting descriptions)
- **Border / Divider:** `#E2E8F0` (Structural separators, unselected inputs)
- **Background Base:** `#FFFFFF` (Main canvas surface)
- **Card Surface:** `#F8FAFC` (Card containers, grouped item backgrounds)

#### Dark Mode
- **Primary / Brand:** `#34D399`
- **Primary Interactive / Hover:** `#6EE7B7`
- **Primary Container / Soft:** `#064E3B`
- **Success / Receivable ("A Receber"):** `#34D399`
- **Critical / Payable ("Deve"):** `#F87171`
- **Warning / Projected ("Prevista"):** `#FBBF24`
- **Text Primary:** `#F1F5F9`
- **Text Secondary:** `#94A3B8`
- **Border / Divider:** `#334155`
- **Background Base:** `#0F172A`
- **Card Surface:** `#1E293B`

### Usage Rules
- Semantic status colors (`#00A868` / `#DC2626` / `#D97706`) must always be paired with textual or iconic indicators to ensure accessibility beyond color distinction alone.
- Tinted backgrounds for negative status balances must use a 10% opacity tint of `#DC2626` (Light) or `#F87171` (Dark).

## Typography

The type hierarchy relies entirely on **Inter**, taking advantage of its mechanical neutrality and precise OpenType metrics.

### Monetary & Tabular Standards
- **Monetary Figures (R$):** Every numeric instance involving currency values, split counters, or date timestamps must enable tabular lining numerals via `font-feature-settings: "tnum" 1, "cv05" 1`. This prevents layout jank when balance counters recalculate.
- **Hierarchy of Values:** Currency symbols ("R$") within headline displays should be set at `label-md` or `headline-sm` aligned to the baseline or superscripted, giving visual prominence to the actual figures.
- **Microcopy:** Status tags and timestamps use `label-sm` with upper/sentence casing to maintain legibility in dense lists.

## Layout & Spacing

Designed primarily for mobile screen dimensions (390px base width), the layout uses a fluid single-column structure with an underlying 4-column responsive grid when partitioning items inside cards.

### Layout Rules
- **Canvas Margins:** Outer page gutters are fixed at `1rem` (16px) to maximize touch surface and screen utility on compact viewports.
- **Component Stacking:** Vertical stacks between unrelated cards adhere to `space-md` (16px). Interleaved list items within a card adhere to `space-sm` (8px).
- **Safe Area Insets:** Fixed bottom navigation and Floating Action Buttons (FAB) reserve explicit bottom padding matching `env(safe-area-inset-bottom) + 16px` to prevent overlap with native gesture bars.
- **Adaptive Breakpoints:**
  - **Compact (Mobile < 480px):** Single-column flow, edge-to-edge summaries with 16px lateral padding.
  - **Medium (Tablet / Foldable 481px - 768px):** Centered container max-width 480px, retaining the native application frame aesthetic.

## Elevation & Depth

Visual hierarchy avoids heavy, dark drop shadows. Instead, it layers content through structured tonal surface differentiation combined with ultra-diffused, ambient micro-shadows.

### Surface Tiers
- **Tier 0 (Base Canvas):** Pure background (`#FFFFFF` light / `#0F172A` dark).
- **Tier 1 (Resting Cards):** Container background (`#F8FAFC` light / `#1E293B` dark) outlined with a 1px border (`#E2E8F0` / `#334155`).
- **Tier 2 (Interactive Floating / Dropdowns):** Subtle ambient diffusion: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)`.
- **Tier 3 (Modals / Bottom Sheets / FAB):** Elevated prominence: `0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`.

In dark mode, shadows drop to zero opacity; depth is instead communicated purely through step-up tonal illumination (e.g., `#0F172A` -> `#1E293B` -> `#334155`).

## Shapes

The interface balances soft modern curves with structural discipline. Border radii are strictly categorized based on component function:

- **Cards & Primary Modules:** `12px` (`0.75rem`) for all balance cards, split group containers, and bottom-sheet headers.
- **Interactive Controls (Inputs & Buttons):** `8px` (`0.5rem`) for text fields, amount inputs, dropdown selectors, and default buttons.
- **Pills, Badges & Avatars:** `999px` (Full circle / pill) for categorical tags, status chips ("A Receber", "Deve"), and user profile indicators.
- **Floating Action Button (FAB):** `24px` for prominent quick-add action triggers.

## Components

### Buttons
- **Primary:** Background `#00A868` (Light) / `#34D399` (Dark), text color solid white or `#0F172A` (in dark mode for high contrast). Height: 48px. Border-radius: `8px`. Font: `label-lg`.
- **Secondary / Soft:** Background `#E6F7F0` (Light) / `#064E3B` (Dark). Text color `#00875A` (Light) / `#34D399` (Dark). Height: 48px.
- **Floating Action Button (FAB):** 56×56px square with `24px` radius or 48px circular pill. Elevated with Tier 3 shadow. Fixed at bottom right: 16px above navigation bar.

### Cards
- **Structure:** Surface `#F8FAFC` (Light) / `#1E293B` (Dark), 1px solid border (`#E2E8F0` / `#334155`), `12px` border-radius.
- **Internal Padding:** `16px` consistent.
- **Balance Card Pattern:** Displays user summary at top of dashboard with split columns: "Você deve" in error color and "A receber" in success color.

### Form Inputs & Monetary Inputs
- **Text Inputs:** Height 44px, radius `8px`, border 1px `#E2E8F0` (`#334155` dark). Active focus ring: 2px `#00A868` with no outline offset.
- **Currency Input Field:** Large dedicated input container with `currency-display` typographic styling, prefix "R$" locked in `text-secondary`, numerals dynamically formatted with tabular spacing.

### Status Chips & Pills
- **Geometry:** Height 24px, radius `999px`, horizontal padding 10px. Typography: `label-sm`.
- **"A Receber":** Background `#E6F7F0`, text `#00875A` (Light) / Background `#064E3B`, text `#34D399` (Dark).
- **"Deve":** Background 10% `#DC2626`, text `#DC2626` (Light) / Background 15% `#F87171`, text `#F87171` (Dark).
- **"Prevista":** Background 10% `#D97706`, text `#D97706` (Light) / Background 15% `#FBBF24`, text `#FBBF24` (Dark).

### Lists & Split Breakdown Rows
- **List Items:** Minimalist 56px rows, subtle horizontal border separator (0.5px `#E2E8F0`).
- **Avatar & Metadata:** 40px circular user avatar on left, title and timestamp stacked in center, tabular amount on far right.

### Iconography
- **Library:** Material Symbols (Filled style), size locked to 24×24px bounding box for primary navigation and transaction categorizations; 18×18px inside inline chips and badges.