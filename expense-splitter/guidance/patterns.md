# UI/UX patterns: Expense Splitter

## Patterns to follow

### Expense item design

- Show description, amount, payer, and date, in that visual hierarchy order
- Amount should be the most prominent element (larger or bolder) since it's what people scan for
- Use the payer's avatar/initials as a small identifying mark (24-32px), not a dominant element
- Timestamps should be relative ("2h ago", "yesterday") with full date on hover
- Category indicators should be subtle: a small icon or colored dot, not a full badge
- Show split type only when it's not the default equal split (don't clutter the common case)
- Clicking an expense should feel immediately responsive (smooth expand/transition to detail view)

### Balance display

- Use color and direction to communicate owe/owed instantly: warm/red for "you owe", cool/green for "you are owed"
- Always pair color with another indicator (icon, +/- sign, text label) for color-blind accessibility
- Show the net balance prominently: clear pairwise amounts ("You owe Alex $45") are the goal
- Format currency amounts with proper symbols, thousands separators, and decimal places for the currency (USD: $1,234.56, JPY: ¥123,456)
- Use `font-variant-numeric: tabular-nums` for all monetary amounts so numbers align in lists
- Zero balances deserve celebration: "All settled up!" is a positive moment, so design it as one

### Navigation & information architecture

- Primary navigation should be a group list in a sidebar (desktop) or bottom bar / hamburger (mobile)
- Each group in the nav shows its name and a brief balance indicator (your net balance in that group)
- Current group should be obvious at all times (active state in nav, group name in header)
- "Add Expense" should be the most prominent action: always accessible, never buried
- Settlement actions ("Settle Up") should be visible but secondary to expense entry
- Collapsible sidebar to maximize content area when working in a single group

### Loading & empty states

- Skeleton screens for group dashboard loading: match the shape of expense items and balance cards
- Spinner or progress indicator for currency conversion
- Empty states should be helpful and action-oriented: "No expenses yet, add your first one!" with a prominent CTA
- New group empty state should feel welcoming, not barren: guide users to add members and their first expense
- Error states should be specific: "Couldn't fetch exchange rates, using cached rates from 2 hours ago" not "Something went wrong"

### Settlement flow

- Settlement suggestions should feel like helpful nudges, not demands ("You could settle up with Alex for $45")
- Show clear pairwise settlement suggestions: who owes whom, and how much
- Make it easy to record a settlement with a single tap/click from the suggestion
- After settling, show a clear confirmation with updated balances
- Settlement history should be visually distinct from expense history (different icon, subtle background tint)

### Forms & data entry

- Expense amount should be the first or most prominent field: it's the critical data
- Auto-fill smart defaults: today's date, group's default currency, "split equally among everyone"
- Validate amounts client-side in real time (not negative, not zero, valid number with appropriate decimal places)
- Currency selection should show symbol and code (e.g., "$ USD" or "¥ JPY")
- Member selection for splits should use visual chips/avatars, not a plain dropdown list
- Show the calculated split result live as the user fills in the form ("$20.00 each" or "$33.34 / $33.33 / $33.33")

### Responsive behavior

- Sidebar collapses to overlay or bottom nav on mobile
- Expense items adapt: show less metadata on small screens (hide category, show only amount, payer, description)
- Touch targets minimum 44x44px on mobile, especially important for member selection in split UI
- Expense entry should feel native on mobile: consider a slide-up sheet or full-screen modal
- Balance summary should be visible without scrolling on mobile (prioritize it above the expense list)
- Settle-up flow should be full-width on mobile with comfortable tap targets for amount confirmation

## Anti-patterns to avoid

### Information overload

- Don't show all expense details in the list view (split breakdown, category, currency conversion, notes). Lead with the essentials; expand for detail.
- Don't display raw numbers without context: "$45.00" means nothing; "You owe Alex $45.00" is clear
- Don't use more than 2 font sizes within a single expense item

### Aggressive UI

- Don't gate guest features behind sign-up prompts. Let guests explore freely, and prompt gently
- Don't use modals for routine actions (adding a simple expense, selecting a category)
- Don't send aggressive "you owe money" messaging. The tone should be neutral and informative, not stressful
- Don't auto-settle or suggest settling for very small amounts (under $1); it feels petty

### Financial UX pitfalls

- Don't truncate amounts. "$1,2..." is unacceptable in a financial app. Always show the full amount.
- Don't mix currency formats. If the group is in USD, show "$45.00" not "45 USD" and "USD 45.00" in different places
- Don't round balances for display when precision matters. Show cents/decimals, and don't say "about $45"
- Don't allow negative expenses without clear UX for what that means (a refund? an adjustment?)
- Don't default to the browser's locale for currency formatting without letting users override it

### Layout pitfalls

- Don't force a fixed sidebar on mobile
- Don't use horizontal scrolling for expense items or member lists
- Don't hide the "Add Expense" button behind navigation. It should always be one tap away
- Don't mix card layouts and list layouts in the same view without clear visual separation

### Performance

- Don't recalculate all balances on every render. Compute once and cache until data changes
- Don't fetch currency exchange rates on every expense view. Cache aggressively (hourly at most)
- Don't load all expenses for a group with 100+ entries. Paginate or virtualize

### Error handling

- Don't show raw error messages or stack traces to users
- Don't silently fail. If a settlement can't be recorded or an expense can't be saved, tell the user
- Don't lose form data on error. If expense submission fails, the form should retain all entered data
- Don't treat all errors the same. A network timeout is temporary; a validation error needs user action
