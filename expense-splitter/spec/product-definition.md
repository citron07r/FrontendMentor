# Product definition: Expense Splitter

## What

Expense Splitter is a group expense management app that lets users split costs with friends, roommates, and travel companions. Users create groups, log shared expenses with flexible split types (equal, exact amounts, percentages, and shares), track multi-currency expenses with real exchange rates, and see clear pairwise settlement suggestions. A beautifully designed group finance tool, built from scratch.

## Who

Anyone who shares costs with other people, from college roommates splitting rent and utilities to friend groups managing a vacation budget.

**User profiles:**

- **The roommate** who splits rent, utilities, groceries, and household supplies every month. Wants a clear picture of who owes what without awkward text conversations or mental math.
- **The trip organizer** who pays for hotels, restaurants, and activities across a multi-day trip with friends. Wants to track everything in one place and settle up fairly at the end, especially when expenses span multiple currencies.
- **The social splitter** who regularly goes to dinners, concerts, and events with different friend groups. Wants a quick, frictionless way to log "I paid, you owe me" without creating spreadsheets.
- **The fair-minded friend** who wants to make sure costs are divided fairly, rather than always equally. Sometimes one person eats more, sometimes someone opts out of an activity. Wants split flexibility beyond simple "divide by N."

## Why

Splitting shared costs is a universal friction point. The mental math is tedious, the tracking is scattered across Venmo requests, text messages, and memory, and the social awkwardness of asking "hey, you still owe me" never goes away. Most people either absorb unfair costs or create messy spreadsheets that nobody maintains.

Expense Splitter solves this by giving groups a shared, transparent record of who paid for what, who owes whom, and a clear path to settling up. One place. Clear numbers. No awkwardness.

## Core value proposition

**"Split expenses. Settle up. Stay friends."**

## What makes this a strong Product Challenge

- **External API integration.** Multi-currency support requires real exchange rate data from an external API, with caching, error handling, and rate-at-time-of-expense logic. This is real-world messiness that pushes beyond typical CRUD apps.
- **Universal appeal.** Everyone splits costs. Roommates, travelers, friend groups, couples, coworkers ordering lunch. The domain is immediately relatable with no specialized knowledge required.
- **Rich data modeling.** Multiple split types (equal, exact, percentage, shares), multi-currency support, settlement tracking, and group membership create a data model with real depth and interesting relationships.
- **Complex split validation.** Exact amounts must sum to the total. Percentages must sum to 100%. Shares must distribute correctly. Each split type has its own rounding edge cases, especially across currencies with different decimal rules (JPY vs USD).
- **Varied design surface.** Expense entry forms, balance displays, settlement flows, group dashboards, and category breakdowns offer a range of UI challenges beyond basic CRUD.
- **Open-ended design decisions.** Three design-it-yourself features give developers room to make genuine product decisions and showcase their design thinking.
