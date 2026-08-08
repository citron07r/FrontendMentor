# Brand kit: Expense Splitter

## Mood & tone

**Cool, precise, trustworthy.** This is a money tool, and it should feel like one that's engineered with care: Linear's calm density crossed with a modern fintech dashboard like Mercury or Ramp. Sharp, quiet, and confident. The numbers do the talking.

- Precise but not cold
- Minimal but not empty
- Technical but still human
- Trustworthy but not corporate-stiff

The cool graphite palette, hairline structure, and monospaced figures signal "your money, handled with precision." Dark mode is the primary showcase; the light theme carries the same cool, exact character.

## Design inspiration

Explore these products for inspiration. They solve adjacent problems with a precise, data-first aesthetic:

- [Linear](https://linear.app): a masterclass in calm, dense, dark UI. Draw from: typographic restraint, hairline dividers, considered use of color for status, tight spacing.
- [Mercury](https://mercury.com) / [Ramp](https://ramp.com): modern fintech dashboards. Draw from: balance clarity, monospaced figures, the proof that a finance tool can feel modern and trustworthy at once.
- [Wise](https://wise.com): clean financial UI with excellent multi-currency handling. Draw from: currency formatting, conversion display, clarity under complexity.
- [Splitwise](https://www.splitwise.com): the domain reference. Draw from: balance presentation, group organization, the settlement flow.
- [Stripe Dashboard](https://stripe.com): data density done elegantly. Draw from: tables, numeric alignment, restrained use of color.

There's no single right design for Expense Splitter. These examples share a precise, trustworthy point of view. If you take the brand in your own direction, keep the clarity and let the data lead.

The `preview.jpg` in the repo root shows these tokens applied to Expense Splitter's group dashboard in dark mode. Use it as a reference for how the brand kit comes together. It's a concept image, not a pixel-perfect spec.

## Color palette

Both light and dark palettes are provided in `tokens.css`. The dark palette is the primary showcase theme (the preview uses it), but both are part of the core project, not a stretch feature.

All text-on-background pairings in both palettes meet WCAG AA (4.5:1 for body text, 3:1 for large text).

### Dark mode

Cool graphite: blue-tinted near-blacks, a single electric-blue accent, with green and rose reserved for balance direction. This is the primary showcase palette.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | `#0A0D13` | Main background (cool near-black) |
| `--color-bg-secondary` | `#0C0F16` | Sidebar |
| `--color-bg-tertiary` | `#151A24` | Hover states, elevated rows |
| `--color-surface` | `#10141C` | Cards, panels, list containers |
| `--color-border` | `#212935` | Borders, dividers |
| `--color-border-subtle` | `#1A202B` | Hairline separators between rows |
| `--color-text-primary` | `#E7EBF2` | Headings, primary text (cool white) |
| `--color-text-secondary` | `#8B94A6` | Body text, descriptions |
| `--color-text-tertiary` | `#788294` | Metadata, timestamps, muted labels |
| `--color-accent` | `#5B8DEF` | Primary actions, links, active states (electric blue) |
| `--color-accent-hover` | `#7FA6F5` | Hover on accent elements |
| `--color-accent-subtle` | `#15203A` | Accent backgrounds, selected states |
| `--color-success` | `#36D29A` | Settlements completed, positive confirmations |
| `--color-warning` | `#E3B341` | Pending settlements, warnings |
| `--color-error` | `#F2606A` | Destructive actions, errors |
| `--color-owe` | `#FB7185` | "You owe" amounts, negative balances (rose) |
| `--color-owed` | `#36D29A` | "You are owed" amounts, positive balances (mint) |
| `--color-owe-subtle` | `#2A171C` | "You owe" card backgrounds, subtle negative tint |
| `--color-owed-subtle` | `#102A22` | "You are owed" card backgrounds, subtle positive tint |
| `--color-focus` | `#5B8DEF` | Focus ring (`:focus-visible`) |

### Light mode

The same cool, exact character in light: slate-tinted neutrals, no warm creams, the same electric-blue accent.

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | `#F6F8FB` | Main background (cool off-white) |
| `--color-bg-secondary` | `#EDF1F6` | Sidebar |
| `--color-bg-tertiary` | `#E3E9F1` | Hover states |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-border` | `#DBE1EA` | Borders, dividers |
| `--color-border-subtle` | `#E7ECF3` | Hairline separators |
| `--color-text-primary` | `#131A26` | Headings, primary text (cool near-black) |
| `--color-text-secondary` | `#566073` | Body text, descriptions |
| `--color-text-tertiary` | `#646E7C` | Metadata, timestamps, muted labels |
| `--color-accent` | `#2A62D6` | Primary actions, links, active states (electric blue) |
| `--color-accent-hover` | `#2156C9` | Hover on accent elements |
| `--color-accent-subtle` | `#E7EEFC` | Accent backgrounds, selected states |
| `--color-success` | `#0A7E55` | Settlements completed, positive confirmations |
| `--color-warning` | `#B5790A` | Pending settlements, warnings |
| `--color-error` | `#D32637` | Destructive actions, errors |
| `--color-owe` | `#D32637` | "You owe" amounts, negative balances |
| `--color-owed` | `#0A7E55` | "You are owed" amounts, positive balances |
| `--color-owe-subtle` | `#FCE7EA` | "You owe" card backgrounds, subtle negative tint |
| `--color-owed-subtle` | `#DCF1E9` | "You are owed" card backgrounds, subtle positive tint |
| `--color-focus` | `#2A62D6` | Focus ring (`:focus-visible`) |

## Typography

### Font stack

| Usage | Font | Token | Fallback |
|-------|------|-------|----------|
| Headings / Group names | `Manrope` (700–800) | `--font-sans` | `system-ui, sans-serif` |
| Body / UI / Form labels | `Manrope` (400–600) | `--font-sans` | `system-ui, sans-serif` |
| Amounts / Numbers / Tags / Dates | `IBM Plex Mono` | `--font-mono` | `ui-monospace, monospace` |

**Manrope** is a clean, geometric grotesk: precise and modern without feeling sterile. It carries the whole interface, from extrabold page titles down to small UI labels, with weight doing the hierarchy work.

**IBM Plex Mono** is the signature of this direction. Every monetary figure (balances, expense amounts, split breakdowns) is set in mono. It makes numbers feel exact, keeps them aligned in columns, and gives the product its "engineered" character. Use it for amounts, split tags, dates, and small metadata, and always pair monetary values with `font-variant-numeric: tabular-nums`.

The contrast between Manrope's clean UI and IBM Plex Mono's precise figures is what makes this brand read as a serious, trustworthy money tool.

Both fonts are free on [Google Fonts](https://fonts.google.com) and [Fontsource](https://fontsource.org). Load them however your stack prefers (a bundler import, `next/font`, or a `<link>`). The fallbacks in `tokens.css` keep text readable until they arrive.

### Type scale

Based on a 1.25 ratio (major third), anchored at 16px body.

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-xs` | 11px / 0.6875rem | 400–500 | 1.45 | Timestamps, currency codes, metadata |
| `--text-sm` | 13px / 0.8125rem | 400–500 | 1.45 | Secondary text, split details, tags |
| `--text-base` | 16px / 1rem | 400 | 1.55 | Body text, expense descriptions |
| `--text-lg` | 20px / 1.25rem | 600 | 1.4 | Section headers, group names |
| `--text-xl` | 25px / 1.5625rem | 600 | 1.3 | Balance amounts |
| `--text-2xl` | 31px / 1.9375rem | 700–800 | 1.25 | Page titles |
| `--text-3xl` | 39px / 2.4375rem | 800 | 1.2 | Landing page hero |

### Font weights

| Token | Weight | Usage |
|-------|--------|-------|
| `--font-regular` | 400 | Body text, descriptions, metadata |
| `--font-medium` | 500 | Amounts, nav items, emphasis |
| `--font-semibold` | 600 | Section headings, buttons |
| `--font-bold` | 700 | Group names, strong emphasis |
| `--font-extrabold` | 800 | Page titles, hero headings |

## Spacing

Based on a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px / 0.25rem | Tight gaps, icon padding |
| `--space-2` | 8px / 0.5rem | Inline spacing, small gaps |
| `--space-3` | 12px / 0.75rem | Compact element spacing |
| `--space-4` | 16px / 1rem | Standard element spacing |
| `--space-5` | 20px / 1.25rem | Medium section gaps |
| `--space-6` | 24px / 1.5rem | Card padding, group spacing |
| `--space-8` | 32px / 2rem | Section spacing |
| `--space-10` | 40px / 2.5rem | Large section gaps |
| `--space-12` | 48px / 3rem | Major section breaks |
| `--space-16` | 64px / 4rem | Page-level spacing |
| `--space-20` | 80px / 5rem | Hero spacing, large gaps |

## Border radius

Graphite leans tight: small-to-medium radii keep the UI feeling precise. Reserve the larger radii for modals and avatars.

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 0.25rem | Tags, chips, small indicators |
| `--radius-md` | 0.5rem | Buttons, inputs, icon tiles |
| `--radius-lg` | 0.625rem | Cards, expense rows, panels |
| `--radius-xl` | 0.875rem | Modals, large containers |
| `--radius-full` | 9999px | Avatars, member circles, pills |

## Shadows

Graphite relies on hairline borders for structure more than shadows. Keep elevation subtle: use shadows only for genuinely floating surfaces (dropdowns, modals, the settle-up dialog).

### Dark mode

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift on hover |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.3)` | Modals, settle-up dialog |

### Light mode

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.05)` | Subtle lift on hover |
| `--shadow-md` | `0 4px 6px -1px rgba(15,23,42,0.07), 0 2px 4px -2px rgba(15,23,42,0.05)` | Dropdowns, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.04)` | Modals, settle-up dialog |

## Icons & visual assets

### Icons

| Recommendation | Alternatives |
|---------------|-------------|
| **Lucide**: clean line icons with a thin, consistent stroke that suits the precise aesthetic. Set the stroke to 1.5–1.8px. Strong coverage for financial icons (receipt, wallet, coins, arrow-up-down, repeat). | Phosphor (flexible weights), Tabler Icons |

Use icons for navigation, actions (add expense, settle up, edit, delete), category indicators, and balance direction. Keep sizes consistent: 16px inline/metadata, 18–20px UI actions, 20–24px navigation.

### Member avatars

Colored initials (first letter of the name on a colored circle), using the per-member `avatarColor` in the sample data. Against the cool, near-monochrome UI, the member colors are the one place the interface lets color pop, so lean into that for member identity.

### Images

Expense Splitter is data-driven: the visual interest comes from the dashboard itself (balances, settlement flows, the numbers). A landing-page hero or product screenshot may help, but stock photography isn't essential.

### App favicon

Ship a custom favicon. It's a small detail that makes the product feel real. An SVG favicon works across all modern browsers.

## Layout

| Token | Value | Usage |
|-------|-------|-------|
| `--sidebar-width` | 16rem | Navigation sidebar (group list) |
| `--content-max-width` | 42rem | Expense list, form content |
| `--detail-pane-width` | 22rem | Expense detail / settlement pane |
| `--page-max-width` | 80rem | Overall page container |

In the optional Tailwind config these map to utilities (`w-sidebar`, `max-w-content`, `max-w-detail`, `max-w-page`) under Tailwind's own namespaces. See `starter/tailwind.css`.

## Key screens for design quality

These are the screens where design taste will be most visible. Pay special attention to typography, numeric alignment, and visual hierarchy:

1. **Group dashboard.** Where users spend 90% of their time. Balance clarity, expense scannability, and the density-vs-readability balance are critical. Monospaced, tabular amounts should line up cleanly.
2. **Landing page.** First impression. Must communicate value instantly and look like a real fintech product, not a student project.
3. **Settlement flow.** The moment tracking pays off. How you present pairwise settlement suggestions and make recording a payment feel clear and trustworthy is what makes the app feel complete.

## Quality spectrum

| Level | What it looks like for Expense Splitter |
|-------|--------------------------------|
| **Adequate** | Expenses display correctly, balances add up, forms work. Consistent spacing and color usage. Looks like a developer's side project: functional but not inspiring. |
| **Good** | Clear typographic hierarchy between amounts, descriptions, and metadata. Monospaced figures align in columns. Considered use of the owe/owed color system. Balance display feels clear and trustworthy. Looks like an early-stage product. |
| **Excellent** | Every number feels considered: tabular mono figures, currencies formatted correctly, balances with real visual weight. Hairline structure and tight spacing make the density feel calm, not cramped. The settlement flow makes settling up feel clear and satisfying. The landing page would make someone ask "wait, is this a real product?" Micro-interactions add precision without distraction. Looks like something you'd trust with your money. |
