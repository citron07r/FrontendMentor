# Design challenges

These features require you to make genuine product decisions. There's no single right answer. Your solution should reflect your understanding of the users, your design taste, and thoughtful trade-offs.

For each, document your approach and reasoning in your README.

---

## 1. Expense entry UX

**The problem:** Expense entry is the most frequent action in the app and arguably the most important to get right. There's a fundamental tension: users want to log expenses quickly (especially on mobile, at a restaurant, splitting a taxi), but the data model is complex: amount, description, who paid, how to split, which members, category, currency. Too many fields and it feels like filling out a tax form. Too few and the data is incomplete.

**Design this:**

- What's the "fast path" for the most common case? (One person paid, split equally among everyone.) How quickly can a user go from "I need to log this" to "done"?
- How do you handle the transition from equal split to advanced split types (exact, percentage, shares)? Is this a tab interface, a dropdown, a progressive disclosure, a separate screen?
- What does expense entry look like on mobile vs. desktop? Consider: full-screen modal, slide-up sheet, inline form, multi-step wizard, single scrollable form.
- How do you handle the "who paid" and "split between" selections? Selecting from a member list, avatar chips, toggle switches? What about the "paid by multiple people" edge case?

**Questions to consider:**

- Should there be a "quick add" mode (minimal fields) and a "detailed" mode (all fields)? Or one adaptive form?
- How much should you auto-fill? (Today's date, last-used category, group default currency, "split among everyone")
- Is there a way to add expenses from a photo/receipt scan? (This could be an AI differentiator.)
- How do you prevent the most common user error, entering the wrong amount or selecting the wrong payer?

---

## 2. Group dashboard design

**The problem:** The group dashboard is the home base for each expense group. It needs to answer several questions at once: "How much have we spent?", "Who owes whom?", "What were the recent expenses?", and "What do I need to do?" Cramming all this information into one view risks visual overload, especially on mobile. But splitting it into too many tabs or pages means extra navigation for simple tasks.

**Design this:**

- What's the information hierarchy? What does the user see first, second, third? Consider: personal balance (what I owe / am owed), group-level summary (total spent, per-member breakdown), recent expenses, settlement suggestions, spending by category.
- How do you balance summary information with detailed views? A glanceable overview vs. a full expense list: same screen or separate tabs/views?
- How does the dashboard adapt from mobile to desktop? What content is visible by default on each breakpoint, and what's behind a tap or scroll?
- How do you surface actionable items? ("You owe $45. Settle up?" or "3 new expenses since your last visit.")

**Questions to consider:**

- Is the dashboard a single scrollable page, a tabbed interface, or a card-based layout?
- How do you handle groups with many members (8-10+)? Does the balance display scale gracefully?
- Should there be a "group settings" area, or should name/currency/members be editable inline?
- How do you differentiate between "this group is active" and "this group is settled and archived"?

---

## 3. Settlement flow design

**The problem:** Settlement is the payoff moment, the whole point of tracking expenses. When it's time to settle up, the app needs to clearly communicate who owes whom, how much, and make recording a payment feel satisfying and complete. Even without the optional debt-simplification algorithm (one of the differentiators), the settlement UX itself needs to do the heavy lifting. Raw numbers ("pay Alex $45") are functional but don't feel like a designed experience. The challenge is making pairwise settlements, which are conceptually simple, feel polished, clear, and rewarding.

**Design this:**

- How do you present settlement suggestions? A list of "you owe X to Y" items? A visual showing all group debts at a glance? Cards with quick-action buttons?
- What does the "record a settlement" flow look like? One tap? A confirmation screen? A mini-form with amount and date?
- How do you handle partial settlements? (User pays $20 of a $45 debt.) Is the remaining amount clear?
- What happens after a settlement is recorded? How do you communicate "success" and the updated state? Does the user see their new balance immediately?

**Questions to consider:**

- How do you make the "all settled up" state feel like a celebration rather than a bare zero?
- Should settlement suggestions show context? ("This is from the Kyoto ryokan and 3 other expenses.")
- How do you handle the scenario where someone owes money to multiple people? One combined view or individual settlement cards?
- What's the mobile experience? Can someone settle up with a single thumb while standing at an ATM?
- How do you build trust in the numbers? Users need to feel confident the suggested amount is correct before they send real money.
