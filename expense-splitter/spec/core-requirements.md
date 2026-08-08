# Core requirements

These features are organized into two tiers. **Core** gives you a complete, impressive product. **Stretch** takes it to the next level. The remaining features (expense entry UX, group dashboard design, settlement flow design) are design challenges where you make the product decisions. See `design-challenges.md`.

Completing Core + a design-it-yourself feature + a differentiator is a strong portfolio piece.

> **Building the frontend-only version?** Feature 10 (User authentication), Guest mode, and Data persistence below assume a backend. The [frontend-only alternative](technical-requirements.md#frontend-only-alternative) explains how each is replaced (local storage instead of a database, a single-user app instead of auth, one landing CTA instead of two). Everything else, including all the split, balance, and currency logic, still applies.

---

# Core

These 11 features form a complete expense-splitting app: a fully working product with authentication, guest access, multi-currency support, and a polished landing page.

---

## 1. Group management

Users can create and manage expense-sharing groups.

**Acceptance criteria:**

- Create a group with a name, description, and default currency
- Add members to a group by name (and optionally email for registered users)
- Edit group name, description, and default currency
- Remove members from a group (only if they have a zero balance)
- Delete a group (with confirmation, only if all debts are settled)
- Display group member list with avatar colors or initials
- Show a group's total expense count and total amount spent

---

## 2. Expense logging

Users can log shared expenses within a group.

**Acceptance criteria:**

- Add an expense with: description, amount, currency, date, category, who paid
- Support "paid by one person" (most common case)
- Select any supported currency for the expense (independent of the group's default currency)
- Assign the expense a category from a predefined list (Food & Drink, Transport, Accommodation, Housing, Entertainment, Shopping, Utilities, Groceries, Other)
- Edit an existing expense (all fields)
- Delete an expense with confirmation
- Show expense details: who paid, how it was split, date, category
- Expenses display in reverse-chronological order within a group

---

## 3. Equal splits

The simplest and most common split type: divide equally among selected members.

**Acceptance criteria:**

- Default split type is "equal" when adding an expense
- Split equally among all group members by default
- Allow excluding specific members from the split (e.g., 4 members but only 3 shared the meal)
- Display each person's share clearly (e.g., "$60.00 split 3 ways = $20.00 each")
- Handle rounding correctly. If $100 is split 3 ways, one person pays $33.34 and two pay $33.33. Choose a deterministic rule for the leftover cent (for example, it goes to the payer) and apply it consistently. The sample data doesn't guarantee one fixed rule, so aim for your shares to sum to the total rather than match the seed data cent-for-cent.
- Recalculate shares when members are added or removed from a split

---

## 4. Advanced split types

Go beyond equal splits to handle real-world splitting complexity.

**Acceptance criteria:**

- **Exact amounts:** Manually enter what each person owes (e.g., Alice: $15, Bob: $25, Carol: $10)
- **Percentage split:** Divide by percentage (e.g., Alice: 50%, Bob: 30%, Carol: 20%)
- **Split by shares:** Divide by relative shares (e.g., Alice: 2 shares, Bob: 1 share, so Alice pays 2/3)
- Validate that splits add up to the total (exact amounts sum to expense total, percentages sum to 100%)
- Show clear error messages when splits don't add up
- UI makes it easy to switch between split types during expense entry
- Display the split method on each expense in the group timeline

---

## 5. Balance calculation

Show who owes what across the group: the core financial state of the app.

**Acceptance criteria:**

- Calculate each member's net balance (positive = owed money, negative = owes money)
- Balances update in real time as expenses are added, edited, or deleted
- Display balances clearly: "You owe Alex $45.00" or "Jordan owes you $22.50"
- Group-level summary: total spent, your total paid, your total share
- Handle the zero-balance state: "All settled up!" with appropriate visual treatment
- Balances must be mathematically consistent: the sum of all balances in a group is always zero
- For multi-currency groups, convert all expenses to the group's default currency for balance calculations

---

## 6. Settle up

Users can record payments between members to settle debts.

**Acceptance criteria:**

- Record a settlement: who paid whom, how much, date
- Suggest pairwise settlement amounts based on current balances (e.g., "You owe Alex $45.00. Settle up?")
- Allow partial settlements (pay less than the full balance)
- Update balances immediately after a settlement is recorded
- Show settlement history alongside expenses in the group timeline
- Mark settlements visually distinct from expenses (different icon, color, or label)
- Prevent settling a debt that doesn't exist (can't pay someone who doesn't owe you)

---

## 7. Multi-currency support

Handle expenses in different currencies within the same group. Essential for travel.

**Acceptance criteria:**

- Each expense can have its own currency (independent of the group's default currency)
- Fetch real exchange rates from a currency conversion API (see `technical-requirements.md`)
- Convert all expenses to the group's default currency for balance calculations
- Show expense amounts in both original and converted currencies
- Allow users to manually override an exchange rate for a specific expense
- Handle at least 10 major currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN)
- Display currency symbols and formatting correctly (e.g., $1,234.56, ¥123,456, 1.234,56 EUR)

---

## 8. Expense categories & filtering

Organize and analyze group spending by category.

**Acceptance criteria:**

- Each expense has a category (predefined list + custom categories)
- Custom categories are saved per user or per group, and work in filters and breakdowns just like the predefined ones
- Filter expenses by category within a group
- Filter expenses by date range
- Filter expenses by member (who paid or who was included)
- Show spending breakdown by category (totals and percentages)
- Category icons or color indicators for quick visual scanning
- Combined filters work together (e.g., "Food & Drink in January paid by Alex")

---

## 9. Responsive design

The app works well across devices. Especially important since users often log expenses on the go.

**Acceptance criteria:**

- The layout adapts naturally across screen sizes. Let your content dictate the breakpoints rather than targeting specific pixel values
- On smaller screens: single-column layout, touch-friendly tap targets, bottom navigation or hamburger menu, easy expense entry on the go
- On larger screens: take advantage of the space, so navigation, expense lists, and group details can coexist comfortably
- No horizontal scrolling
- Navigation is accessible and usable on all screen sizes
- Font sizes and spacing are comfortable on each device class
- Forms (especially expense entry) are usable on mobile without zooming

---

## 10. User authentication

Secure, personal experience across devices.

**Acceptance criteria:**

- Sign up with email and password
- Sign in / sign out
- Password reset flow
- Persist all user data (groups, expenses, balances, settlements, preferences) per account
- Auth state persists across browser sessions
- Protected routes redirect unauthenticated users to sign-in
- Guest mode allows full exploration without an account (see "Try as Guest" requirements)

---

## 11. Landing page

The first impression and entry point.

**Acceptance criteria:**

- Hero section with clear, compelling value proposition
- 3-4 feature highlights that communicate what makes Expense Splitter useful
- Dual CTAs: "Sign Up" and "Try as Guest", both prominent
- Responsive design that works well on mobile through desktop
- Visual quality that sets the professional tone for the entire product
- Fast load time (no heavy assets blocking render)

---

## Light & dark mode

Both light and dark themes are part of the core product, not a stretch goal. The brand kit and starter tokens ship both palettes.

**Acceptance criteria:**

- Support both light and dark color schemes using the provided tokens
- Respect the user's OS preference by default (`prefers-color-scheme`)
- A manual theme toggle is recommended so users can override the OS setting and have their choice persisted
- All text meets WCAG AA contrast in both themes
- Avoid a flash of the wrong theme on initial load

---

## Guest mode

Visitors can explore the full app without creating an account. This is critical for portfolio value. When a hiring manager, colleague, or community member clicks your deployed link, they're not going to create an account. Guest mode is what lets them see your work.

**Acceptance criteria:**

- Single click from landing page enters guest mode
- Dashboard is pre-loaded with 5 sample groups spanning different use cases: a multi-currency travel group, a recurring roommate group, a casual office lunch group, a one-off occasion group, and a short-term trip group
- Guest sees realistic data with settled and unsettled debts, different split types, multiple currencies, and a mix of categories
- Guest can browse groups, view expenses, see balances, and explore the settlement suggestions
- Gentle prompts to sign up to save their data (not aggressive gating)
- Guest data is session-based (not persisted across visits unless they sign up)
- Clear messaging about what signing up unlocks (persistence, custom groups, sync)

---

## Data persistence

All user data stored in a real database.

**Acceptance criteria:**

- Use a real database service (Supabase, Firebase, Neon, PlanetScale, etc.)
- Store: groups, members, expenses, splits, settlements, user accounts, preferences
- Data persists across sessions and devices for authenticated users
- Efficient queries: don't load all expenses when showing a single group's balances
- Handle concurrent updates gracefully if multiple signed-in members can edit the same group at once. If members are name-only (no separate logins), treat this as forward-looking rather than required.

---

# Stretch

These features take the product to the next level. They build on the Core foundation and are recommended for developers who want to go deeper.

---

## 12. Activity feed

A chronological record of everything happening in a group.

**Acceptance criteria:**

- Show a timeline of all group activity: expenses added, expenses edited, expenses deleted, settlements recorded, members added/removed
- Each activity entry shows: who did it, what they did, when, and relevant details
- Distinguish between expense entries and settlement entries visually
- Show timestamps as relative time ("2h ago", "yesterday") with full date on hover
- Load activity efficiently: paginate or infinite scroll for groups with many entries
- Activity updates reflect in near real time for other group members (within a reasonable polling interval)

---

## 13. Recurring expenses

Automate regular shared costs like rent, utilities, and subscriptions.

**Acceptance criteria:**

- Mark an expense as recurring with a frequency: weekly, biweekly, monthly
- Recurring expenses auto-generate on schedule (or prompt the user to confirm each occurrence)
- Edit the recurring template to change future occurrences
- Stop/pause a recurring expense
- Show recurring expenses with a visual indicator (icon or badge)
- Allow one-off adjustments to a single occurrence without affecting the template (e.g., utilities bill varies monthly)

---

## 14. Export & reports

Let users export their data and view spending summaries.

**Acceptance criteria:**

- Export group expenses as CSV
- CSV includes: date, description, amount, currency, category, paid by, split type, each member's share
- Group spending summary: total spent, per-member totals, per-category breakdown
- Date range filtering for reports (this month, last month, custom range)
- Per-member spending comparison (who tends to pay more, who pays less)

---

## 15. Performance

The app must feel fast and responsive, especially on mobile where users log expenses in the moment.

**Acceptance criteria:**

- Initial group load completes in under 3 seconds
- Expense entry to confirmation in under 1 second (optimistic updates)
- Smooth scrolling through groups with 50+ expenses
- Balance calculations complete instantly after expense changes
- Images and avatars lazy-load to avoid blocking initial render
- Time to interactive on landing page under 2 seconds
- No layout shifts during content loading (use skeleton screens or placeholders)
