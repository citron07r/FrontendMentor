# Differentiators

Differentiators are optional but recommended. Pick 1-2 if you want to push the project further and showcase deeper expertise.

Each one demonstrates a specific skill area and meaningfully changes the user experience. Choose based on your interests and the skills you want to showcase.

Document your choice, implementation approach, and what you learned in your README.

---

## 1. Interactive data visualization

**Skill area:** Data visualization

Build rich, interactive charts and graphs that help groups understand their spending patterns.

**What to build:**

- Spending over time: line or area chart showing group expenses by week/month
- Category breakdown: donut or treemap chart showing spending distribution
- Member contribution: stacked bar chart showing who's paying for what
- Balance history: chart showing how each member's balance has changed over time
- Interactive tooltips with details on hover
- Responsive charts that work on mobile (touch-friendly interactions)
- Export charts as images for sharing

**Why this is impressive:** Data visualization is a high-impact design skill that's difficult to do well. Building compelling, interactive, responsive charts from financial data requires charting library expertise (D3, Chart.js, Recharts), meaningful metric selection, and clear visual communication. It turns a ledger into insights.

---

## 2. Debt simplification algorithm

**Skill area:** Algorithms / Computer science

Minimize the number of transactions needed to settle all debts in a group: a genuine computer science problem.

**What to build:**

- Given N members with various debts, calculate the minimum (or near-minimum) number of payments to settle everyone
- Example: If Alice owes Bob $10 and Bob owes Carol $10, the simplified settlement is Alice pays Carol $10 directly (1 transaction instead of 2)
- Handle groups up to 20 members efficiently
- Show both the "naive" settlements (direct pairwise debts) and the "simplified" settlements so users can see the optimization
- Settlement amounts must be mathematically correct: after all suggested settlements are completed, every member's balance is zero
- Handle edge cases: circular debts, members who are already settled, very small residual amounts (under $0.01) from rounding
- Visualize the before/after difference to make the optimization tangible

**Algorithm guidance:**

This is a genuine computer science problem. The general case (minimum number of transactions to settle N people) is NP-hard, but practical approaches work well for typical group sizes:

- **Greedy approach:** Repeatedly match the person who owes the most with the person who is owed the most. Simple to implement, produces good (not always optimal) results.
- **Graph-based approach:** Model debts as a directed graph, find net balances, then use a matching algorithm. Can produce optimal results for small groups.
- **Subset-sum approach:** For optimal solutions, partition members into subsets that sum to zero, then settle within each subset. Exponential worst case but fast for small N.

Any approach that produces correct, simplified settlements is acceptable. Document which algorithm you chose and why in your README.

**Why this is impressive:** Debt simplification is one of the few real-world problems where algorithmic thinking makes a visible, tangible difference to users. Implementing it well demonstrates both CS fundamentals and the ability to communicate complex optimization results clearly.

---

## 3. Smart expense suggestions

**Skill area:** AI integration / UX innovation

Use patterns in past expenses to make logging new ones faster and more accurate.

**What to build:**

- Suggest descriptions and categories based on typing patterns (e.g., typing "Ub" suggests "Uber" with category "Transport")
- Learn from group patterns: if this group usually splits restaurant bills equally, pre-select equal split
- "Quick re-add" for common recurring expenses: "Add another grocery run?" with pre-filled details from the last similar expense
- Detect potential duplicates: "This looks similar to an expense added 2 hours ago. Is it the same?"
- Monthly spending insights: "Your group spent 40% more on dining this month vs. last month"

**Why this is impressive:** Smart suggestions require thoughtful data analysis, pattern recognition, and UX design that makes intelligence feel helpful rather than presumptuous. It demonstrates the ability to build features that improve over time as data accumulates, a quality employers associate with senior-level product thinking.

---

## 4. Receipt scanning with AI

**Skill area:** AI integration

Use AI to extract expense details from a photo of a receipt, making expense entry dramatically faster.

**What to build:**

- Camera or file upload to capture a receipt image
- AI-powered extraction of: total amount, date, merchant/description, currency
- Pre-fill the expense entry form with extracted data (user confirms and adjusts)
- Handle common receipt variations: different languages, tax/tip breakdowns, itemized vs. total-only
- Graceful fallback when extraction fails or is uncertain: highlight low-confidence fields
- Optional: itemized extraction that lets users assign individual line items to different members

**Why this is impressive:** AI-powered data extraction from images is one of the most practical uses of generative AI. Building it well requires handling image processing, API integration, prompt engineering for structured data extraction, confidence scoring, and a UX that makes AI feel helpful rather than error-prone. It transforms a tedious manual process into a one-tap action.
