# DESIGN.md - Huddle Landing Page

## 1. Visual Theme & Atmosphere
Friendly, confident, community-focused. Clean marketing landing page. Bold primary background with decorative overlays.

## 2. Color Palette & Roles
- **Primary Background:** Purple 700 `hsl(257, 40%, 49%)`. Use for full page background and default CTA text.
- **Accent/Interaction:** Magenta 400 `hsl(300, 69%, 71%)`. Use strictly for hover/active/focus states.
- **Neutral/Foreground:** White `hsl(0, 0%, 100%)`. Use for logo, headings, body copy, button surface, social icon borders.

## 3. Typography Rules
- **Headings (Display):** Poppins (Weights 400, 600). H1 uses 600, ~2.5rem desktop, ~1.5rem mobile, line-height ~1.5.
- **Body:** Open Sans (Weight 400). ~1.125rem desktop, ~1rem mobile, line-height ~1.6.

## 4. Component Stylings
- **Header Logo:** `images/logo.svg`. Desktop width ~200px, padding ~4rem top / 5rem sides. Mobile width ~120px, padding ~2rem. Alt text required.
- **Primary CTA:** White pill button, `border-radius: 999px`. Text "Register" in Poppins 400, Purple 700 `hsl(257, 40%, 49%)`. Subtle drop shadow. Desktop ~200px x 3.5rem. Mobile ~200px x 2.5rem.
- **CTA States (Hover/Focus/Active):** Background Magenta 400 `hsl(300, 69%, 71%)`. Text changes to White. Cursor pointer.
- **Social Icons (Footer):** Circle wrapper, 1px solid White border. White glyph. Desktop ~2.5rem diameter, right-aligned. Mobile ~2rem diameter, center-aligned.
- **Social Icon States (Hover/Focus/Active):** Border AND glyph change to Magenta 400 `hsl(300, 69%, 71%)`.
- **Focus Rings:** Visible `:focus-visible` outlines matching Magenta 400 for keyboard navigation.

## 5. Layout Principles
- **Page Structure:** Header (logo) -> Hero (illustration + text + CTA) -> Footer (social icons).
- **Background Assets:** Purely decorative, hidden from AT. Top-left, no-repeat, sized to cover/contain.
  - `<768px`: `images/bg-mobile.svg`
  - `>=768px`: `images/bg-desktop.svg`
- **Hero Desktop (`>=1024px`):** 2 columns.
  - Left column (~60%): `images/illustration-mockups.svg`.
  - Right column (~40%): Left-aligned text block (H1, paragraph, CTA).
- **Hero Mobile (`<1024px`):** 1 column. Centered illustration, centered H1, centered paragraph, centered CTA.

## 6. Depth & Elevation
- Base layer: Solid Purple 700 background.
- Background layer: Decorative SVG patterns.
- Foreground layer: Content (Header, Hero, Footer).
- Elevation: Subtle drop shadow on Primary CTA button.

## 7. Do's and Don'ts
- **DO:** Use exact HSL values provided.
- **DO:** Use relative paths for existing assets (`images/...`).
- **DO:** Ensure WCAG-compliant contrast (White on Purple 700).
- **DO:** Add descriptive alt text for logo and illustration. Add `aria-label` for social links.
- **DON'T:** Invent colors.
- **DON'T:** Inline SVG assets. Link via `img` or CSS background.
- **DON'T:** Add animations, parallax, or extra sections.
- **DON'T:** Expose decorative background images to screen readers.

## 8. Responsive Behavior
- **Mobile-first:** Target widths 375px (mobile) and 1440px (desktop).
- **Breakpoints:** `768px` (background image switch), `1024px` (layout switch from 1 col to 2 cols).
- **Scaling:** Fluid and intact from 320px to large screens. Avoid horizontal scrolling.

## 9. Agent Prompt Guide
Implement HTML/CSS strictly adhering to this DESIGN.md. Use 1 HTML file.
Assets exist at `images/logo.svg`, `images/illustration-mockups.svg`, `images/bg-desktop.svg`, `images/bg-mobile.svg`. Do NOT recreate them.
Use Google Fonts for Poppins and Open Sans.
Apply Purple 700 (`hsl(257, 40%, 49%)`) background. Apply Magenta 400 (`hsl(300, 69%, 71%)`) on all interactive hover/focus states. Center mobile layout, split desktop layout. Validate WCAG accessibility for all interactive elements.