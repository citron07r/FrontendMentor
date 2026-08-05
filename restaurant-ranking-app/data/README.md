# Sample Data: Tastemap (London)

## Files

| File | Format | Purpose |
|------|--------|---------|
| `sample-places.json` | JSON | Complete dataset for the guest experience — 32 London places (14 ranked + 18 want-to-try) and 25 pairwise comparisons |

## What's in it

A lived-in personal food map of London: 32 places, split into two states.

- **14 ranked "been" places** — each has a `rank` (1–14), a `visits` count, and a personal `note`. Brat is #1; the order runs down through Padella, Kiln, St. JOHN, BAO, Lahore Kebab House, and on.
- **18 "want-to-try" places** — `status: "want"`, `rank: null`, `visits: 0`. Bookmarked spots with a reason, spread across the city (Mayfair splurges, Whitechapel grills, Peckham and Camberwell treks).
- **25 comparisons** — the pairwise results (each records whether `aId` or `bId` won, via `result`) that justify the ranked order, including one `"tie"` ("too close to call"). This is the data the ranking algorithm consumes.

The places are real London restaurants at approximate real coordinates, so the map looks like a genuine map of the city. Cuisines span British, Spanish/Basque, Italian, Thai, Indian/Pakistani, Taiwanese/Chinese/Vietnamese, Middle Eastern/Turkish/Persian, West African, and European — enough variety to exercise the cuisine-tinted avatars and the cuisine filter.

## Data shape

Each place:

```jsonc
{
  "id": "brat",                       // stable slug
  "name": "Brat",
  "cuisine": "Basque",                // single primary cuisine label (a string)
  "cuisineGroup": "spanish",          // maps to an avatar tint (see brand-kit)
  "specialty": "Wood-fire grill",     // the dish/style it's known for — short phrase
  "area": "Shoreditch",               // neighbourhood label
  "address": "First Floor, 4 Redchurch St, London E1 6JL",
  "lat": 51.5241, "lng": -0.0756,
  "priceLevel": 3,                    // 1–4, or null if unknown
  "status": "ranked",                 // "ranked" (been) | "want"
  "rank": 1,                          // 1-based position, or null for want-to-try
  "visits": 3,
  "tags": ["date-night", "whole-fish", "wood-fire"],
  "note": "…",                        // personal note; may be long or empty ""
  "photo": null,                      // no images shipped — keep it image-light
  "website": "https://bratrestaurant.co.uk",  // official site, or null if unknown
  "dateAdded": "2024-03-18"
}
```

**On `cuisine` vs `specialty`:** `cuisine` is a single, filterable label (one string, not an array) — it's what the cuisine filter and the `cuisineGroup` tint key off. `specialty` is the human, editorial detail — the dish or style the place is known for ("Pasta", "Nose-to-tail", "Ocakbaşı grill") — for the list row and detail view. Keeping cuisine to one value keeps filtering and the avatar tint unambiguous; `specialty` is where the character lives.

**On `website`:** an official site URL, or `null` where none is on record (Silk Road ships as `null` on purpose — a real place with no dedicated website). Treat it as optional — render a link when present, and don't render a broken "Visit website" affordance when it's `null`.

**No bundled logos.** The dataset intentionally carries no `logo` field and the starter ships no logo image assets — real restaurant marks are trademark-fraught and licensing-fragile. Each place is identified by a cuisine-tinted initial avatar (see `guidance/brand-kit.md`). Fetching a real logo at runtime with the avatar as a fallback is an optional enhancement, not part of the shipped data — see `spec/differentiators.md`.

Each comparison:

```jsonc
{ "aId": "brat", "bId": "padella", "result": "a", "date": "2024-03-20" }
// result: "a" (aId won) | "b" (bId won) | "tie" (too close to call)
```

`meta` carries the map center, default zoom, price-level legend, and the list of cuisine groups.

## The ranking model

The dataset gives you **both** representations on purpose, so you can decide how to model it (see `spec/technical-requirements.md` → "How do you model the ranking?"):

- a **resolved order** (`rank` on each ranked place) — trivial to render, and
- the **raw comparisons** that produced it — the honest source of truth.

If you store raw comparisons and recompute, the 25 comparisons here should reproduce the `rank` order (they form a consistent chain from Brat down, with a couple of cross-checks and one tie). If you store positions directly, `rank` is your seed. Either is valid — just be able to justify it.

## Edge cases (baked in on purpose)

### Status & ranking

| Edge case | Where | What to handle |
|-----------|-------|----------------|
| **Want-to-try, no rank** | 18 places, `rank: null` | Must not appear in the ranked list or get a rank numeral; shown as honey pins / a separate "Want to try" view |
| **A tie in comparisons** | `cafe-deco` vs `berenjak` → `"tie"` | Your algorithm must handle "too close to call" without crashing or forcing a false order |
| **New place with zero comparisons** | Any want-to-try promoted to "been" | Placing a brand-new place should trigger the comparison flow, not assume a position |

### Data completeness

| Edge case | Where | What to handle |
|-----------|-------|----------------|
| **Empty note** | `akoko` (`note: ""`) | Layout must not look broken with no note |
| **Very long note** | `brat` (multi-sentence) | Detail view and any preview must handle long text (clamp/wrap) |
| **Unknown price** | none ship as `null`, but the schema allows it | Don't render "£null"; treat missing price gracefully |
| **Missing website** | `silk-road` (`website: null`) | Only render the "Visit website" link when a URL exists — no broken/empty affordance |

### Map / geography

| Edge case | Where | What to handle |
|-----------|-------|----------------|
| **Overlapping pins** | `lahore-kebab-house` & `tayyabs` (Whitechapel); several in Soho | Cluster or offset so pins stay tappable |
| **Outliers far from center** | `silk-road` (Camberwell), `peckham-bazaar` (Peckham) | "Fit all pins" / bounds logic must include the far-south places |
| **Dense cluster** | Soho holds ~7 places within a few hundred metres | Clustering and hover-to-highlight matter most here |

## Using the sample data

### For the guest experience

On **"Try as Guest"**, load `sample-places.json` into session-scoped storage (it must never touch your real database) and render the full map + ranked list immediately. The 32-place map is the first impression — it should look like someone's genuinely obsessive food map, which is what makes a visitor want their own.

**Recommended flow:**
1. Seed guest state from the JSON.
2. Render the map (pins) and the ranked list side by side.
3. Let the guest add a place and rank it via the comparison flow — all in-session, no persistence.
4. Prompt sign-up at a natural moment (e.g. when they try to save or share).

### For the frontend-only path

Use the same file as the default starting state (there's no "guest" concept — everyone who opens the app is the user). Persist changes to `localStorage`; treat this JSON as the initial seed.

### For development & testing

The data deliberately exercises: an empty note, a long note, a tie, overlapping pins, far-flung outliers, a dense Soho cluster, multi-cuisine places, and a full 1–4 price spread. Test your ranked list, comparison flow, map clustering, filters, and detail view against it before you build your own data.

**Note on dates:** `dateAdded` values run from late 2023 through mid-2025, and comparisons from 2024. They're for ordering/recency features ("recently added", "your year in food") — adjust if you need them relative to today.
