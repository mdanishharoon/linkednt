## <!-- SEED — re-run $impeccable document once there's code, to extract real tokens and generate the DESIGN.json sidecar. -->

name: Linkednt
description: Uncanny-valley LinkedIn that tells the truth, a deadpan brand surface for a slop-translating Chrome extension.
colors:
bg-canvas: "oklch(0.95 0.008 85)"
surface: "oklch(0.99 0.003 85)"
surface-sunken: "oklch(0.93 0.008 85)"
ink: "oklch(0.24 0.012 260)"
ink-muted: "oklch(0.52 0.012 260)"
border: "oklch(0.88 0.008 85)"
brand: "oklch(0.52 0.15 250)"
brand-hover: "oklch(0.45 0.16 250)"
brand-tint: "oklch(0.95 0.03 250)"
puncture: "oklch(0.90 0.19 112)"
correction: "oklch(0.55 0.18 25)"
success: "oklch(0.58 0.13 150)"
typography:
display:
fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
fontWeight: 700
lineHeight: 1.05
letterSpacing: "-0.02em"
headline:
fontFamily: "Inter, system-ui, sans-serif"
fontSize: "1.563rem"
fontWeight: 600
lineHeight: 1.2
letterSpacing: "-0.01em"
body:
fontFamily: "Inter, system-ui, sans-serif"
fontSize: "1rem"
fontWeight: 400
lineHeight: 1.55
letterSpacing: "normal"
label:
fontFamily: "Inter, system-ui, sans-serif"
fontSize: "0.75rem"
fontWeight: 600
lineHeight: 1.2
letterSpacing: "0.04em"
rounded:
sm: "4px"
md: "8px"
pill: "999px"
spacing:
xs: "4px"
sm: "8px"
md: "16px"
lg: "24px"
xl: "48px"
components:
button-primary:
backgroundColor: "{colors.brand}"
textColor: "{colors.surface}"
rounded: "{rounded.pill}"
padding: "10px 24px"
button-primary-hover:
backgroundColor: "{colors.brand-hover}"
textColor: "{colors.surface}"
rounded: "{rounded.pill}"
padding: "10px 24px"
post-card:
backgroundColor: "{colors.surface}"
textColor: "{colors.ink}"
rounded: "{rounded.md}"
padding: "16px"

---

# Design System: Linkednt

## 1. Overview

**Creative North Star: "The Honest Impostor"**

Linkednt's surface wears LinkedIn's exact clothes, the warm linen feed, the white post cards, that one specific corporate blue, the comfortable rounded density, and then says the quiet part out loud. It is close enough to the real feed to feel uncanny, and that recognition is the whole setup. The puncture is never a different _look_; it is the truth bleeding through a familiar frame. The brand identity is committed (LinkedIn-blue carries the mimicry) while execution stays restrained (neutral linen and white do most of the work, exactly as the real feed does).

This system explicitly rejects the generic AI-startup landing page: no purple gradients, no glassmorphism, no hero-metric template, no gradient text. That cliche _is_ the slop this product exists to mock. It also rejects sincere enterprise-SaaS earnestness, the mimicry must always carry its puncture, or the joke dies. And it rejects zany meme-spam; the frame is composed and deadpan even as motion gets expressive.

The one place this system lets loose is motion. The reveal, slop transforming into honest plain English, is the product's whole promise made visible, so it earns a genuinely expressive, choreographed payoff. Stillness sets the deadpan tone; the transformation is the punchline that moves.

**Key Characteristics:**

- Uncanny-valley fidelity to LinkedIn's real visual language, by design.
- Committed brand blue, restrained neutral execution.
- A single acid "puncture" accent marking every moment of honesty.
- One typeface throughout; the joke comes from color and copy, never a novelty font.
- Expressive, choreographed reveal motion against an otherwise composed frame.

## 2. Colors

The palette is LinkedIn's own neutrals and blue, faithfully, with one deliberately "wrong" acid accent that marks wherever the truth leaks through. All values OKLCH; neutrals tinted warm toward LinkedIn's linen so nothing reads as a clinical `#fff`/`#000`.

### Primary

- **Corporate Blue** (`oklch(0.52 0.15 250)`): The committed identity anchor. LinkedIn's blue, used for links, primary buttons, and interactive accents. It sells the mimicry. Hover deepens to `oklch(0.45 0.16 250)`; `brand-tint` (`oklch(0.95 0.03 250)`) backs subtle blue-wash hover states.

### Secondary

- **Acid Puncture** (`oklch(0.90 0.19 112)`): The one "wrong" color, a highlighter green-yellow that never appears in a real LinkedIn UI. It marks the honest translation, underlines the punchline, backs the "translated" badge. A background/marker only, always paired with `ink` text. Its rarity is the entire point.

### Tertiary

- **Correction Red** (`oklch(0.55 0.18 25)`): Semantic only, the redline struck through deleted slop in a before/after. Never decorative.
- **Confirm Green** (`oklch(0.58 0.13 150)`): Success states (extension installed, copied). Quiet.

### Neutral

- **Linen Canvas** (`oklch(0.95 0.008 85)`): Warm off-white page background. The single strongest LinkedIn "tell."
- **Card White** (`oklch(0.99 0.003 85)`): Post and panel surfaces, warm near-white.
- **Sunken** (`oklch(0.93 0.008 85)`): Input wells and inset areas.
- **Ink** (`oklch(0.24 0.012 260)`): Primary text, warm near-black. Never pure black.
- **Muted Ink** (`oklch(0.52 0.012 260)`): Timestamps, captions, secondary meta.
- **Hairline** (`oklch(0.88 0.008 85)`): Borders and dividers; the primary separator in a flat system.

### Named Rules

**The Puncture Rule.** The acid accent appears on no more than ~10% of any screen, and only where the product is being honest. If it spreads, the uncanny mimicry collapses and the joke with it.

**The No-Slop-Palette Rule.** Purple gradients, neon-on-dark, and glassmorphic tints are forbidden. Those are the exact aesthetics the product mocks; shipping them is shipping slop.

## 3. Typography

**Display Font:** Inter (with `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`)
**Body Font:** Inter (same stack)
**Label Font:** Inter (same stack)

**Character:** One neutral corporate grotesk throughout, deliberately. LinkedIn reads as a flat, professional sans, so the surface does too. The contrast between performative slop and honest truth is carried entirely by color, weight, and copy, not by a novelty typeface. Using a "fun" font would announce the joke; the deadpan demands restraint here.

### Hierarchy

- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 1.05, tracking -0.02em): Landing hero headline only.
- **Headline** (600, 1.563rem, line-height 1.2): Section headers, the faux-credential name line on a post card.
- **Body** (400, 1rem, line-height 1.55): All running text. Capped 65–75ch.
- **Label** (600, 0.75rem, tracking 0.04em): Badges, button text, meta tags. The "translated" badge lives here.

Scale steps follow a 1.25 ratio (0.75 / 0.875 / 1 / 1.25 / 1.563 / 1.953 / 2.441rem). Hierarchy comes from scale + weight contrast; no flat scales.

### Named Rules

**The One-Voice Rule.** A single typeface, no exceptions. The honest translation is set in the same Inter as the slop it replaces; only color, weight, and the words themselves change. The truth looking _identical_ to the lie, minus the puncture, is the point.

## 4. Elevation

LinkedIn-flat. Depth comes from hairline borders and warm tonal layering (linen canvas behind card-white surfaces), not from shadow. This keeps the mimicry honest, the real feed is nearly shadowless, and avoids the lifted, glassy look the product mocks.

### Shadow Vocabulary

- **Raised** (`box-shadow: 0 1px 3px oklch(0.24 0.012 260 / 0.08)`): The single permitted shadow, for menus, dropdowns, and a card on hover. Soft, warm-tinted, barely there.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest, separated by hairlines. The one soft shadow appears only on transient/raised elements (menus, hover). Glassmorphism and decorative blur are forbidden.

## 5. Components

> Seed defaults synthesized from the brand brief. Replace with scanned variants once the landing is built.

### Buttons

- **Shape:** Pill (`999px` radius), mirroring LinkedIn's buttons.
- **Primary:** `brand` fill, `surface` text, padding `10px 24px`. Used for "Add to Chrome."
- **Hover / Focus:** Background deepens to `brand-hover`; visible focus ring in `brand` at 2px offset. Subtle, fast (150ms).
- **Secondary:** `brand` outline + `brand` text on transparent, same pill.

### Cards / Containers

- **Post Card:** The canonical LinkedIn-mimic unit. `surface` background, `border` hairline, `8px` radius, padding `16px`. Avatar + faux-credential name line + timestamp header, body text, quiet action row. This is where the slop lives before translation.
- **Shadow Strategy:** Flat at rest; `Raised` shadow on hover only.

### Inputs / Fields

- **Style:** `surface-sunken` background, `border` hairline, `8px` radius.
- **Focus:** Border shifts to `brand`, 2px focus ring at offset. No glow.

### Navigation

- **Style:** Slim top bar over `surface`, hairline bottom border, `label`/`body` weight links in `ink-muted`, active link in `brand`. Mirrors LinkedIn's global nav silhouette. Mobile collapses to a single CTA plus menu.

### Translation Reveal (signature)

The hero interaction and the product's whole pitch made literal. A post card's performative slop transforms in place into the honest plain-English version: slop text struck/fading in `correction`, honest text arriving with a `puncture` marker and a "translated" `label` badge. This is the one place motion goes expressive, a choreographed, satisfying swap (200–320ms, ease-out-quint `cubic-bezier(0.22, 1, 0.36, 1)`, opacity + transform only, never layout properties, no bounce or elastic). Scroll can stage a sequence of these. Honors `prefers-reduced-motion` by becoming an instant swap.

## 6. Do's and Don'ts

### Do:

- **Do** mirror LinkedIn's real visual language closely: warm linen canvas (`oklch(0.95 0.008 85)`), white cards, corporate blue, pill buttons, comfortable density. The fidelity is the joke's setup.
- **Do** reserve the acid `puncture` accent for honest moments only, ≤10% of any screen.
- **Do** carry the slop-vs-truth contrast through color, weight, and copy, set both in the same Inter.
- **Do** make the translation reveal expressive and choreographed; it is the one motion moment that earns its payoff. Ease-out curves, opacity/transform only.
- **Do** keep the frame composed and deadpan everywhere else. Restraint is the punchline's setup.

### Don't:

- **Don't** ship the generic AI-startup landing page: no purple gradients, no glassmorphism, no hero-metric template, no `background-clip: text` gradient text. That cliche is the slop the product mocks.
- **Don't** let the mimicry read as a _sincere_ enterprise-SaaS or LinkedIn clone. Every mimic needs its puncture, or the joke is dead.
- **Don't** go zany or meme-spammy. Deadpan means composed; loud randomness undercuts the dry, meta-ironic voice.
- **Don't** introduce a novelty "fun" font to signal humor. One neutral grotesk, always.
- **Don't** use `border-left`/`border-right` >1px as a colored accent stripe, or animate layout properties, or add bounce/elastic easing.
