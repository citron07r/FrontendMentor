# Frontend Mentor — Results summary component

A solution to the [Results summary component challenge on Frontend Mentor](https://www.frontendmentor.io/challenges/results-summary-component-CE_K6s0maV).

## Table of contents

- [Overview](#overview)
- [Screenshot](#screenshot)
- [Links](#links)
- [Running the project](#running-the-project)
- [Built with](#built-with)
- [What I learned](#what-i-learned)
- [Continued development](#continued-development)
- [Author](#author)

## Overview

The challenge is to build a results summary card that matches the provided design and adapts between a stacked mobile layout and a two-column desktop layout.

Users should be able to:

- View the optimal layout depending on their device's screen size
- See hover and focus states for all interactive elements

The optional bonus **is** implemented: the four category rows are fetched from `data.json` at runtime and rendered into the empty `.summary-list` element, so changing a score means editing the JSON, not the markup. The overall result (76 of 100, "Great") is not part of `data.json` and stays in the markup.

Because the data is fetched, the page must be served over HTTP — opening `index.html` from the filesystem shows a message asking the reader to serve it instead.

## Screenshot

![Desktop layout of the results summary component](./screenshot.png)

## Links

- Live site: https://citron07r.github.io/FrontendMentor/summary-component/
- Solution repository: https://github.com/citron07r/FrontendMentor/tree/main/summary-component

## Running the project

No build step or dependencies are required — the component is an HTML file, a stylesheet, a script, and local data, font, and icon assets. It does need to be served over HTTP so the `data.json` fetch succeeds:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000/summary-component/ from the repository root.

## Built with

- Semantic HTML5 markup
- CSS custom properties
- Flexbox
- Mobile-first workflow
- `rem` and `clamp()` sizing so text respects browser font-size settings
- Self-hosted Hanken Grotesk via `@font-face`
- Vanilla JavaScript with `fetch` for the JSON-driven summary list

## What I learned

Defining the colour palette as HSL custom properties on `:root` made the translucent category backgrounds trivial: the same hue is reused at 5% alpha with `hsla()` instead of hand-picking a second tint per category.

Decorative category icons are hidden from assistive technology with an empty `alt` attribute plus `aria-hidden`, while each panel is labelled through `aria-labelledby` pointing at its own heading, so the card reads as two named regions rather than a flat list of text.

The continue button uses `:focus-visible` with a double `box-shadow` ring so keyboard focus stays visible against both the white mobile background and the pale blue desktop background.

The summary script is a classic deferred script rather than a module. A `type="module"` script is blocked outright when the page is opened over `file://`, which means the code never runs and the `catch` branch never gets a chance to explain why the list is empty. A classic script does run, the `fetch` rejects, and the reader sees the error message instead of a silently missing section.

## Continued development

- Promote the colour and spacing tokens into a shared stylesheet once more challenges reuse them
- Move the overall score and grade into `data.json` so the whole card is data-driven

## Author

- GitHub: [@citron07r](https://github.com/citron07r)
- Frontend Mentor: [@citron07r](https://www.frontendmentor.io/profile/citron07r)
