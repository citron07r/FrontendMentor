# Technical requirements

This challenge supports two paths: **full-stack** (recommended) and **[frontend-only](#frontend-only-alternative)**. The sections below describe the full-stack approach. If you'd rather skip auth and database work, jump to the [frontend-only alternative](#frontend-only-alternative) at the bottom. It explains what changes and what stays the same.

## Database

Use a real database service, not localStorage or in-memory storage.

**Recommended options:** Supabase, Firebase, Neon, PlanetScale, Turso, or equivalent.

**Must store:**

- User accounts and authentication data
- Groups (name, description, default currency, created date)
- Group memberships (user-to-group relationships, including non-registered "guest" members identified by name)
- Expenses (amount, currency, description, category, date, paid-by member, group, split type)
- Splits (expense-to-member breakdown: who owes what per expense)
- Settlements (from member, to member, amount, date, group)
- User preferences (default currency, notification settings)

**Things to think about:**

- How will you model group members who aren't registered users? (e.g., "Alex" added to a trip group by name only.) They need to participate in splits and balances but don't have an auth account.
- How will you calculate balances efficiently? Recalculating from all expenses on every page load won't scale. Consider: materialized balance columns, running totals, or computed views.
- What happens when an expense is edited or deleted? How do you recalculate affected balances and settlements? Is this a cascade operation or an event-driven recalculation?
- How will you store split details for different split types? An equal split among 4 people and an exact-amount split with custom values per person need different data shapes.
- How do you handle currency conversion data? Store the exchange rate at the time of the expense, or re-fetch rates dynamically?
- What's your strategy for groups with 50+ expenses over several months? How do you keep the balance calculation page fast?

## Authentication

Implement real user authentication, not simulated or mocked.

**Required flows:**

- Sign up (email + password minimum)
- Sign in
- Sign out
- Password reset
- Session persistence across browser refreshes

**Recommended:** Use your database provider's built-in auth (Supabase Auth, Firebase Auth) or a dedicated auth service (Clerk, Auth0, NextAuth).

**Guest mode:** Must work without authentication. Guest data is session-scoped and does not persist.

## Currency conversion API

Multi-currency support requires real exchange rate data. This is the challenge's required external integration.

**Recommended APIs (free tiers available):**

- [ExchangeRate-API](https://www.exchangerate-api.com/): simple, reliable, generous free tier
- [Open Exchange Rates](https://openexchangerates.org/): well-documented, widely used
- [Fixer.io](https://fixer.io/): EU Central Bank rates, good for EUR-based conversions
- [FreeCurrencyAPI](https://freecurrencyapi.com/): a straightforward free option

**Requirements:**

- Fetch current exchange rates for converting between currencies
- Cache exchange rates to avoid excessive API calls (rates don't change by the minute, so hourly or daily caching is appropriate)
- Store the exchange rate used at the time an expense is created (so historical balances remain stable even if rates change)
- If a user manually overrides the rate for an expense, store that value as the expense's rate and use it for all balance math. Flagging it as user-set is a nice touch.
- Handle API failures gracefully: show the last cached rate with a "rates may be outdated" indicator, and don't block expense entry
- Support at minimum: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN

**Things to think about:**

- Exchange rates are asymmetric (the USD-to-JPY rate is not exactly the inverse of JPY-to-USD, because of spreads). Handling this is an optional refinement. The sample data keeps things simple with a single stored rate per expense, which is fine for this challenge. Modeling both directions is a nice touch if you want to go further.
- Should you convert at the time of expense entry or at settlement time? Each has trade-offs for fairness.
- How do you display converted amounts? Inline, on hover, in a separate column?

## Balance calculation

Balance calculation is pairwise: calculate the net balance between each pair of members based on expenses and settlements.

**Technical considerations:**

- The input is all expenses in a group with their split breakdowns, plus any recorded settlements.
- For each expense: the payer is credited for the full amount, and each member in the split is debited their share.
- Net balance per member = total they paid - total they owe.
- Pairwise settlement suggestions: for each pair where one owes the other, suggest the net amount. ("You owe Alex $45.00.")
- For multi-currency groups, convert each expense to the group's default currency using the rate stored at the time of the expense.
- Edge case: rounding errors can leave residual balances of $0.01 or less. Decide on a threshold below which a balance is treated as zero.
- Settlement state is derived from balances and recorded settlements. There is no per-expense "settled" flag. An expense contributes to balances until those balances are cleared by settlements.

## Deployment

Deploy to a live, publicly accessible URL.

**Recommended platforms:** Vercel, Netlify, Render, Fly.io, or equivalent.

**Requirements:**

- Accessible via HTTPS
- No local-only dependencies (everything works for any visitor)
- Environment variables properly configured (no exposed secrets, especially API keys for currency conversion)
- Reasonable cold start time if using serverless

## Performance targets

| Metric | Target |
|--------|--------|
| Landing page Time to Interactive | < 2 seconds |
| Group dashboard load (after auth) | < 3 seconds |
| Expense entry to confirmation | < 1 second |
| Balance recalculation after expense change | < 500ms |
| Scrolling through 50+ expenses | Smooth (60fps, no jank) |
| Layout shift during load | Minimal (use skeletons/placeholders) |

### Lighthouse benchmarks

Run Lighthouse on your deployed site. Target scores:

| Category | Target |
|----------|--------|
| Performance | > 85 |
| Accessibility | > 90 |
| Best Practices | > 90 |

Include your Lighthouse scores in your README.

## Technology choice

This challenge is **framework-agnostic**. Use whatever you're most productive with.

**Common choices:**

- Next.js, Nuxt, SvelteKit, Remix, Astro (full-stack frameworks)
- React, Vue, Svelte, Solid (with separate backend)
- Any other approach that meets the requirements

The starter files provide CSS custom properties and a Tailwind v4 config, but neither CSS nor Tailwind is required. Use whatever styling approach you prefer.

## Frontend-only alternative

The sections above describe the recommended full-stack approach. If you're focused on frontend development and not ready to implement authentication and a database, you can build a frontend-only version instead. Everything below explains what changes and what stays the same.

**What replaces the database:**

Use localStorage (or IndexedDB for larger datasets) to persist all user data: groups, expenses, splits, settlements, and preferences. Be aware that localStorage has a ~5 MB limit per origin and that all data lives in a single browser, so there is no cross-device sync.

**What changes in the product experience:**

- No authentication: the app is single-user with no sign-up, sign-in, or password reset flows
- No "guest mode" concept: there is only the app, and everyone who opens it is the user
- The landing page has a single CTA ("Get Started" or "Open Dashboard") instead of dual sign-up and guest buttons
- No cross-device sync: switching browsers or clearing storage means starting over
- Pre-loaded sample groups become the default starting state rather than a guest-specific experience

**What stays the same:**

- Currency conversion API integration, still required for multi-currency support
- All expense management, split calculation, and balance features
- Deployment to a live, publicly accessible URL
- The performance targets listed above

**Tradeoff to consider:**

Both paths produce strong portfolio pieces. The full-stack version demonstrates additional skills (auth flows, database design, protected routes, data modeling), while the frontend-only version lets you focus on UI/UX craft, currency handling, state management, and frontend engineering. Choose the path that matches your current skill level and learning goals.
