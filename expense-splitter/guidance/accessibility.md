# Accessibility requirements: Expense Splitter

## WCAG 2.1 AA compliance checklist

This checklist covers the accessibility requirements for Expense Splitter. All items are required unless marked as recommended.

### Perceivable

#### Text & color

- [ ] All text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Color is never the sole means of conveying information (e.g., balance direction uses icons + color, not color alone)
- [ ] "You owe" and "You are owed" states are distinguishable without color (use +/- prefix, directional icons, or text labels alongside the green/red coloring)
- [ ] Links are distinguishable from surrounding text without relying on color alone (underline or other indicator)
- [ ] Currency amounts have sufficient contrast against their backgrounds, including on colored balance cards

#### Images & media

- [ ] All images have alt text or are marked decorative (`alt=""`)
- [ ] Member avatar initials are decorative (the member name is communicated separately via text)
- [ ] No images of text (use real text for all UI elements, including amounts and currency symbols)

#### Structure

- [ ] Proper heading hierarchy (h1 -> h2 -> h3, no skipped levels)
- [ ] Landmark regions used appropriately (`<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`)
- [ ] Lists of expenses use `<ul>` / `<ol>` / `<li>` elements
- [ ] Tables (if used for balance breakdowns or reports) have proper headers and captions
- [ ] Page titles are descriptive and unique per view (e.g., "Trip to Japan - Expense Splitter" not just "Expense Splitter")

### Operable

#### Keyboard

- [ ] All interactive elements are reachable via Tab key
- [ ] Focus order follows a logical reading sequence
- [ ] Focus is visible on all interactive elements (`:focus-visible` styling)
- [ ] No keyboard traps; users can always Tab away from a component
- [ ] Modal/dialog focus is trapped within the dialog and restored on close (expense entry, settle-up confirmation)
- [ ] Custom keyboard shortcuts (if implemented) don't conflict with assistive technology
- [ ] Skip link provided to bypass navigation and jump to main content

#### Navigation

- [ ] Current group/page is indicated in navigation (aria-current)
- [ ] Breadcrumbs or clear location indicators provided (e.g., "Groups > Trip to Japan")
- [ ] Back button / navigation works predictably
- [ ] Multiple ways to reach content (nav sidebar, group list, direct links)

#### Timing

- [ ] Auto-refresh doesn't disrupt user's current position (e.g., new expenses from other members don't scroll the page)
- [ ] No time limits on interaction (guest session is an exception, so document it)
- [ ] Animations respect `prefers-reduced-motion` media query

### Understandable

#### Forms & input

- [ ] All form fields have visible labels (not just placeholder text), especially the amount field
- [ ] Error messages are specific and associated with the relevant field (via `aria-describedby`)
- [ ] Required fields are indicated both visually and programmatically (`aria-required`)
- [ ] Form submission errors don't clear already-entered data
- [ ] Amount input provides helpful error messages ("Please enter a valid amount greater than zero")
- [ ] Split validation errors clearly explain the issue ("Percentages must add up to 100%. Currently: 95%")
- [ ] Currency selection provides clear feedback about format expectations

#### Language & content

- [ ] Page language is set (`<html lang="en">`)
- [ ] Error messages use plain language, not technical jargon
- [ ] Financial terms are clear and consistent throughout (avoid mixing "balance", "debt", "owes" inconsistently)

### Robust

#### Assistive technology

- [ ] Valid, well-structured HTML
- [ ] ARIA attributes used correctly (roles, states, properties)
- [ ] Dynamic content changes announced via `aria-live` regions (balance updates, expense confirmations, settlement completions)
- [ ] Custom components (dropdowns, modals, split-type selector) follow ARIA authoring practices

#### Interactive components

- [ ] Dropdown menus are keyboard accessible and announce their state (expanded/collapsed)
- [ ] Toggle buttons announce their state (pressed/not pressed)
- [ ] Loading states are announced to screen readers ("Fetching exchange rates...")
- [ ] Settlement confirmation announces the result to screen readers ("Settlement recorded: you paid Alex $45.00")
- [ ] Split type selector announces the current selection and available options

## Expense Splitter-specific accessibility considerations

### Currency & amount formatting

- Currency amounts should be announced naturally by screen readers. Use `aria-label` where needed to provide natural language (e.g., `aria-label="You owe forty-five dollars"` rather than relying on the screen reader to parse "$45.00")
- For multi-currency displays, ensure both the original amount and converted amount are announced with their respective currency names
- Use `<abbr>` or `aria-label` for currency codes that might be unfamiliar (e.g., CHF = Swiss Franc)
- Tabular number formatting (`font-variant-numeric: tabular-nums`) is a visual enhancement, so ensure screen readers still announce amounts naturally

### Balance & debt status

- Balance direction (positive/negative, owe/owed) should be conveyed through:
  - Icon + color (not color alone)
  - Directional text ("You owe" / "You are owed")
  - Screen reader text that announces the full context (e.g., `aria-label="You owe Alex forty-five dollars and zero cents"`)
- The "All settled up" state should be announced to screen readers when it's reached
- Settlement suggestions should be announced as actionable items, not just informational text

### Group member selection

- Member selection controls (for splits, "paid by" selection) should:
  - Be keyboard navigable
  - Announce member names, not just avatar colors
  - Indicate selected/unselected state for each member
  - Announce the count of selected members ("3 of 4 members selected")

### Settlement flow

- Settlement suggestions should be clearly communicated:
  - Each suggestion includes who owes whom and the amount
  - Text is the primary communication method (not just visual indicators)
  - Settlement actions (confirm, edit amount, dismiss) must be keyboard accessible
  - Settlement confirmations are announced to screen readers via `aria-live`
- If using any visual representation of debts:
  - Provide a text-based alternative that lists all suggested payments
  - The text alternative should be equally prominent, not hidden behind a toggle
  - Interactive elements must be keyboard accessible

## Recommended (beyond AA)

These go beyond minimum compliance and signal strong accessibility awareness:

- [ ] Customizable font size for reading comfort
- [ ] High contrast mode option
- [ ] Reduced motion mode that eliminates all non-essential animation
- [ ] Screen reader testing with at least one of: VoiceOver (Mac), NVDA (Windows), or TalkBack (Android)
- [ ] Natural language amount announcements (e.g., "forty-five dollars" not "dollar sign four five period zero zero")
- [ ] Keyboard shortcut for quick expense entry from anywhere in the app

## Testing

Before submission, verify:

1. Navigate the entire app using only the keyboard: add an expense, view balances, settle a debt
2. Use a screen reader to complete core tasks: browse groups, view who owes what, understand settlement suggestions
3. Check all pages with a contrast checker tool, especially balance cards with colored backgrounds
4. Test with browser zoom at 200%
5. Test with `prefers-reduced-motion: reduce` enabled
6. Run an automated audit (Lighthouse, axe, or WAVE)
