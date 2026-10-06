# Design — VerbaTask

The locked design system for the VerbaTask frontend. Every page reads from it.
To grow the system, amend this file. Don't override it page by page.
Token source: `src/styles/tokens.css`. Tailwind mapping and shared classes: `src/app.css`.

## Genre
Playful (Hum) by day, atmospheric (Lumen Night Foundry) by night. Custom theme "Counter":
*warm bazaar counter, machined voice ledger.*

## Themes
| | Day counter (light) | Night counter (dark, `.dark` on `<html>`) |
|---|---|---|
| Paper | `oklch(97.2% 0.013 92)` cream | `oklch(16% 0.016 205)` teal-black |
| Ink | `oklch(22% 0.022 195)` | `oklch(95.5% 0.012 95)` |
| Teal (links, active, data) | `oklch(50% 0.085 185)` | `oklch(81% 0.105 172)` |
| Pear (primary action, highlighter, character) | `oklch(89% 0.165 102)` | `oklch(88% 0.16 102)`, emits |
| Coral (one emphatic moment, danger) | `oklch(63% 0.19 28)` | `oklch(71% 0.16 28)` |

Default theme follows the OS (`system`). The toggle stores `light`/`dark`.
Multi-accent rules: each accent owns its own surface, and gradients never run between accents.

## Typography
- Display: **Space Grotesk** 600, tracking −0.035em, always roman (no italic headings).
- Body: **Geist** 400 (350 on dark).
- Mono outlier: **JetBrains Mono**. Used only for UPPERCASE machine labels (`.label`), numbers and receipts.
- Scale tokens: `--fs-*` (major third). Don't name them `--text-*`, which collides with Tailwind v4.

## Components
- Buttons: `.btn` (pear push: lifts on hover, presses down on click), `--primary` (teal push), `--soft`, `--outline` (fill sweeps up), `--ghost`, `--danger`, `--ink`; sizes `--sm`, `--lg`. React: `<Button variant="primary|teal|secondary|outline|ghost|danger|ink">`.
- Cards: `.surface-card`, hairline + contact/ambient shadow by day, hairline + inner pear emission by night. `tone="flat"` gives a borderless tinted block.
- Emphasis: `.hl` highlighter painted on the text. At night it becomes a thin drawn underline.
- Lumen moves: `blueprint` grid utility (dark hero), meter strip, leader-line callouts.
- Character: one pulsing pear `.rec-dot` per page (hero apparatus), with a coral `.star-burst` on play.

## Macrostructures
- Marketing (`/`): **Narrative Workflow** with an H2 split-diptych hero (7/5) whose right side holds the VoiceLedger apparatus. Below it come the meter strip, Problem (big + small), 4 stages (1.0–4.0, zig-zag, accent-tinted visuals), Features (the one dense section), the comparison spec sheet, the pear pricing band, the sticky FAQ, and an Ft5 statement footer that carries the closing CTA.
- Content (`/faq`, `/contact`): index-first typographic layouts with the same nav and footer.
- App (`/dashboard/*`): Workbench console with asymmetric spans (7/5, 8/4, 4/8, 5/7, 3/9). Two neighbouring pages never share a composition.
- Auth: a 5/7 split, with an ink slab beside a left-aligned form.
- Nav: N1b (marketing), side rail (app). Footer: Ft5 Statement.

## Motion
`--ease-out` / `--ease-in` / `--ease-in-out`, plus `--ease-press` for buttons only. Page load runs one `.reveal` stagger.
No scroll-triggered fades and no infinite loops except the recording dot.
Accordions animate `grid-template-rows`. `prefers-reduced-motion` collapses motion to opacity and stops the dot.

## Rules every page keeps
- Colours and fonts come from tokens only. Pages contain no raw hex values or Tailwind palette colours.
- No glassmorphism, side-stripe cards, gradient text, emoji icons or fake device/browser chrome.
- Eyebrows are mono labels, stacked above headings, never beside them.
- Metrics shown are the shop's real data. Marketing visuals use a labelled demo sale.
- At 320, 375, 414 and 768px: no horizontal page scroll, and clickable labels never wrap.
