# typer

A beautiful, local-first typing trainer. Everything runs and stays in your browser — no accounts, no tracking, no network.

## Features

- **Modes** — time (15/30/60/120s), words (10/25/50/100), quotes, custom text, a **weak-key practice drill** built from your own mistake stats, and a **daily challenge**: the same seeded test for everyone each day
- **Modifiers** — punctuation, numbers, word-length tiers (short/any/long), force-correct mode, and **sudden death** (one mistake ends the test)
- **6 keyboard styles** — laser, solid, retro, terminal, low profile, and gummy — pairable with any of the **7 sound packs**
- **33 themes** — including animated flair types: aurora, **starfield**, **gradient mesh**, and a **vapor grid horizon**
- **Live feedback** — WPM/accuracy, sparkline, correct-streak with milestone sounds, countdown ticks, red-line final-seconds progress, live WPM in the tab title
- **Results** — count-up stats, WPM-over-time chart with error markers and a PB reference line, keyboard **replay** of your exact keystrokes (seek + speed), shareable result card (copy image or save PNG), confetti on personal bests
- **3D keyboard** — physical key highlighting, parallax tilt, weak-key heat map, error pulse, auto-scales from desktop down to phones
- **Sound engine** — 7 synthetic switch packs (tactile, topre, bubble, thock, clicky, typewriter, linear) via Web Audio, with per-row depth
- **25 themes** — with premium flair variants (aurora, glass, gradient text), light and dark
- **Stats page** — totals, today card, day streak, WPM progression chart, weak keys, personal bests, recent tests, plus export/import/reset of all your data
- **Mobile & PWA** — touch input with "tap to type", installable, fully offline (fonts precached), safe-area aware
- **Zen mode**, first-visit onboarding, reduced-motion support, screen-reader live regions

## Controls

| Key | Action |
| --- | --- |
| `tab` | restart test |
| `esc` | back / exit zen |
| `enter` | new test (on results) |

## Development

```bash
npm install
npm run dev        # vite dev server
npm run lint       # oxlint
npm test           # vitest (engine + component tests)
npm run e2e        # builds, serves, and runs the Chrome viewport matrix
npm run build      # production build + PWA service worker
npm run icons      # regenerate PWA icons from the logo design
```

## Stack

Vite · React 19 · Tailwind CSS 4 · Framer Motion · Web Audio API · vite-plugin-pwa · vitest + Testing Library · puppeteer-core (e2e)
