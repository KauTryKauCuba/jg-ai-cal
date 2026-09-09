# Jejaku Design Language

## Overview

Jejaku is a personal projects site, not a product marketing site — the design language reflects that: quiet, editorial, and light on chrome. Every page opens with the **gradient mesh** — a soft, slowly-drifting radial-blob backdrop in cream, amber, seafoam, teal, and emerald green — sitting behind the header and hero only, before the page drops to plain white (`{colors.canvas}`) for everything else. There are no dashboard mockups, no pricing tables, no dark "product UI" surfaces. The visual vocabulary is: gradient hero, flat bordered cards, a pill-shaped auth/onboarding card, and a scroll-driven tab section.

The color system centers on **Emerald Green** (`{colors.primary}` — `#00594c`), used sparingly for the single filled pill button per section and for link/label emphasis. **Deep green-black ink** (`{colors.ink}` — `#07211c`) is the body text color everywhere — never pure black. Amber, seafoam, and citrine live only inside the animated gradient mesh blobs and the `IconFlowBadge` accent lines; they never appear as button or text colors.

Typography runs on **Inter** (`next/font/google`, weights 300/400/500/600) with the `ss01` stylistic set enabled globally on `<body>`. Headlines render at weight 300 (font-light) with tight negative tracking; UI text (nav, labels, buttons) sits at 400–600. Numeric/tabular values use the `.tabular` utility (`tnum` + tightened tracking).

**Key Characteristics:**
- Gradient mesh confined to the hero band only (header + first section) — the rest of every page is flat white or `{colors.canvas-soft}`/`{colors.canvas-cream}`.
- Mesh is **animated**: three blurred radial blobs drift slowly (22–30s ease-in-out loops), disabled entirely under `prefers-reduced-motion`.
- Single filled `{colors.primary}` pill button per view; secondary actions are outline or plain-text links.
- Flat, shadow-free bordered cards (`card-content-flat`) are the workhorse container — used for auth, onboarding, projects, values, specs, and stack grids alike.
- `IconFlowBadge`: a small rounded-square icon tile with faint animated flow-lines behind the icon, used as the leading visual in every card grid.
- Scroll-locked tab section (`ValuesSpecsTabs`): mouse-wheel scroll near the section temporarily hijacks scrolling to step through tabs before releasing.
- Auth/onboarding pattern: compact bordered card, eyebrow label with icon, Google button + divider + email-OTP form, or a name/avatar form — never a full-page auth screen.
- Cream interlude band (`{colors.canvas-cream}`) as a short, centered, text-only pause between sections.
- Roadmap page: a single vertical timeline (`{colors.ink-mute}` connector line, filled dots for Started/Shipped entries, outline dots for "Up next") — the only chronological/log-style layout on the site.
- Cross-app session handoff: signing in on Jejaku carries the profile into Jejaku Receipt via a one-time base64 URL param on the project-card CTA; signing out of either app clears both via a `?signout=1` round-trip. See `ProjectCard.tsx` / `RemoteSignOut.tsx`.

## Colors

> **Source:** `app/globals.css`, `app/page.tsx`, `app/onboarding/page.tsx`.

### Brand & Accent
- **Emerald Green** (`{colors.primary}` — `#00594c`): Filled-pill CTA, link emphasis, active tab fill.
- **Green Deep** (`{colors.primary-deep}` — `#003d33`): Eyebrow/label text on light surfaces, avatar-initial text.
- **Green Press** (`{colors.primary-press}` — `#00251f`): Pressed-state (reserved; not yet wired to an active-state class).
- **Green Soft** (`{colors.primary-soft}` — `#00a19a`): Wordmark color in header/footer; gradient/flow-line mid-stop.
- **Green Subdued** (`{colors.primary-subdued}` — `#b7e4dd`): Soft pill-tag background (e.g. the "tool" tag on project cards).
- **Brand Dark 900** (`{colors.brand-dark-900}` — `#052e27`): Defined as a token but not currently used in any shipped surface — reserve for a future dark/inverted panel.
- **Amber** (`{colors.amber}` — `#e8a33d`): Gradient-mesh blob stop only.
- **Seafoam** (`{colors.seafoam}` — `#7fe0c4`): Gradient-mesh blob stop and `IconFlowBadge` flow-line stop.
- **Citrine** (`{colors.citrine}` — `#c9a227`): Reserved gradient stop; not currently rendered.

### Surface
- **Canvas** (`{colors.canvas}` — `#ffffff`): Default page background; card background.
- **Canvas Soft** (`{colors.canvas-soft}` — `#f4faf8`): Mesh base gradient, `IconFlowBadge` tile fill, inactive-tab pill background, avatar placeholder fill.
- **Canvas Cream** (`{colors.canvas-cream}` — `#f5efd4`): The "none of this is finished" interlude band; also a mesh blob stop.
- **Hairline** (`{colors.hairline}` — `#dce9e5`): 1px card/footer/divider borders.
- **Hairline Input** (`{colors.hairline-input}` — `#a8d4c9`): Borders on inputs, Google button, avatar-upload circle.

### Text
- **Ink** (`{colors.ink}` — `#07211c`): Default body/heading text.
- **Ink Secondary** (`{colors.ink-secondary}` — `#1c352e`): Hero subhead, nav link idle state.
- **Ink Mute** (`{colors.ink-mute}` — `#5c766e`): Helper text, captions, card body copy, inactive tab label.
- **Ink Mute 2** (`{colors.ink-mute-2}` — `#5a726b`): Reserved near-equivalent of ink-mute (nav-specific slot).
- **On Primary** (`{colors.on-primary}` — `#ffffff`): Text on filled green surfaces.

### Semantic
- **Error** (`{colors.error}` — `#c4362b`): Form field error border/message text. This is the only semantic color in the system — there is no success/warning/info palette.

## Typography

### Font Family

**Inter**, loaded via `next/font/google` with weights `300/400/500/600`, exposed as `--font-inter` and mapped to Tailwind's `font-sans`. `font-feature-settings: "ss01"` is applied globally via a `.ss01` class on `<body>`. There is no proprietary/fallback font stack to manage — Inter is the actual production font, not a substitute.

### Hierarchy (as used, not a fixed token table)

| Role | Size | Weight | Tracking | Example |
|---|---|---|---|---|
| Hero headline | 38px → 53px (md+) | 300 (font-light) | -1.14px → -1.33px | `page.tsx` H1 |
| Section heading | 30px | 300 | -0.61px | "Projects" |
| Cream-band heading | 25px | 300 | -0.25px | "None of this is finished" |
| Card title | 19px | 300 | -0.19px | project/value/spec/onboarding card titles |
| Body / lead | 16px | 400 | 0 | hero subhead |
| Card body | 14px | 400 | 0 | card copy, helper text |
| Eyebrow / label | 12px | 500 (font-medium), uppercase | 0.1px | "Almost there", spec labels, tag pills |
| Caption / meta | 12–13px | 400–500 | 0 | footer links, form error text, helper captions |
| Button label | 14–16px | 500 (font-medium) | 0 | pill buttons |
| Tabular value | 19px | 300 | -0.19px + `tnum` | spec values (RAM, storage, etc.) |

### Principles
- **Weight 300 for anything read as a headline or card title.** Body copy, labels, and buttons sit at 400–500 — the thin/regular contrast (not a display/body split) is the brand's typographic rhythm.
- **Tighter negative tracking scales down with size**, roughly -1.3px at 53px down to -0.19px at 19px; body/caption sizes carry 0 tracking.
- **`.tabular` utility** (`font-feature-settings: "tnum" 1, "ss01" 1; letter-spacing: -0.42px`) — apply to any numeric spec/measurement value, not just money (there is no currency UI yet).
- **`ss01` is global**, set once on `<body>` — never re-applied per-component.

## Layout

### Spacing System
Spacing values in this codebase are **arbitrary bracket values tuned by eye**, not a strict 8px scale — typical values are `8 / 11 / 15 / 19 / 23 / 30 / 38 / 46 / 61 / 76 / 91px`. Treat these as the working scale rather than forcing round 8px multiples.

- **Section vertical padding**: 91px (hero, projects, tabs section) / 76px (cream interlude) / 61px (footer).
- **Card internal padding**: 30px standard (`card-content-flat`), 23px on small screens for the hero auth card.
- **Grid gaps**: 23px between cards; 46px between a section's intro copy and its grid.

### Grid & Container
- Header/footer container: `max-w-7xl` / `max-w-6xl` respectively, horizontal padding 23px (30px at `lg`).
- Content sections: `max-w-6xl`, cream interlude narrows to `max-w-3xl` and centers text.
- Card grids: 1-col mobile → `md:grid-cols-2` (projects) or `md:grid-cols-3` (values/specs/stack) → `lg:grid-cols-3` (projects).
- Hero: 1-col mobile stacked, `lg:grid-cols-2` (copy left, auth card right).

### Whitespace Philosophy
The gradient mesh is deliberately short — one hero band, not a page-spanning wash. Everything below it returns to flat white/soft-canvas immediately, keeping the rest of the page quiet and text-forward.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat, no shadow | Default — nearly every card on the site (`card-content-flat`, auth card, onboarding card) |
| 1 | Gradient mesh (animated blur blobs) | The site's only depth medium — no box-shadows are used anywhere in the current UI |

There is currently no shadow-based elevation system in use — cards are distinguished by a 1px `{colors.hairline}` border on `{colors.canvas}`, not by lift. If a future component needs to visually float above the page, introduce a shadow token deliberately rather than defaulting to one.

### Decorative Depth
`.gradient-mesh` is three stacked, absolutely-positioned, blurred (`blur(40px)`) radial-gradient pseudo-elements/divs (`::before`, `::after`, `.mesh-blob`), each with its own slow drift keyframe animation (translate + scale, 22–30s loops). All three are disabled via `prefers-reduced-motion`. This is implemented in plain CSS, not SVG or a static image.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved, not currently used |
| `{rounded.sm}` | 6px | Form inputs |
| `{rounded.md}` | 8px | `IconFlowBadge` tile |
| `{rounded.lg}` | 12px | All content cards (`card-content-flat`, auth card, onboarding card) |
| `{rounded.xl}` | 16px | Reserved, not currently used |
| `{rounded.pill}` | 9999px | Buttons, tag pills, tab-switcher container/buttons |

### Photography Geometry
There is no photography or product-UI mockup pattern in this site — it's a text/icon-driven personal site. The only "image" surfaces are the wordmark logo (`/jk-logo.svg`) and user-uploaded avatar previews (circular, `object-cover`, 64×64px).

## Components

### Buttons

**`button-primary-pill`** — the one filled CTA per view.
- Background `{colors.primary}`, text `{colors.on-primary}`, height `37px`, padding `0 15–16px`, `font-medium`, rounded `{rounded.pill}`.
- Press feedback via `active:scale-[0.98]` (a transform, not a color-swap pressed state).

**`button-outline-pill`** — used for the Google auth button.
- Background `{colors.canvas}`, text `{colors.ink}`, 1px `{colors.hairline-input}` border, same pill geometry, `hover:bg-canvas-soft`.

**`tab-pill`** — segmented control button (see `ValuesSpecsTabs`).
- Active: `{colors.primary}` fill, `{colors.on-primary}` text. Inactive: transparent, `{colors.ink-mute}` text. Sits inside a `{colors.canvas-soft}` pill-shaped track with 4px padding.
- Height `37px` (explicit, content vertically centered via flex) — not derived from padding.

All interactive pill/rectangular buttons are explicit `height: 37px` (`h-[37px]`), never padding-derived — padding-only sizing drifts a pixel or two with line-height/font differences, which is exactly the "39px vs 37px" mismatch to avoid. Center content with `flex items-center [justify-center]` instead of relying on vertical padding for balance.

### Cards & Containers

**`card-content-flat`** — the one card pattern used everywhere: projects, values, specs, stack, hero auth, onboarding.
- Background `{colors.canvas}`, padding `30px`, rounded `{rounded.lg}` 12px, 1px `{colors.hairline}` border, **no shadow, ever**.
- Structure: optional `IconFlowBadge` or eyebrow label up top, `19px`/weight-300 title, `14px` `{colors.ink-mute}` body, optional trailing link/action.

**`card-auth`** — the hero auth card and onboarding card are the same shape as `card-content-flat`, specialized with an icon+eyebrow header (`Fingerprint`/`Prompt` icon + uppercase label), a form body, and helper copy below.

### Inputs & Forms

**`text-input`**
- Background `{colors.canvas}`, text `{colors.ink}`, `14px`, height `37px` (explicit, not padding-derived), horizontal padding `11px`, rounded `{rounded.sm}` 6px, 1px `{colors.hairline-input}` border, `focus:border-primary`.
- Any trigger styled to sit in a form row alongside a text input (dropdown `Select`, date picker) shares this same explicit `37px` height so the row lines up exactly.
- Error state swaps the border (and adds a `12px` `{colors.error}` message below) to `{colors.error}` — no red background fill.
- Label sits above the field: `13px` `font-medium` `{colors.ink}`.

**Avatar upload control** (`OnboardingForm`)
- 64×64px circular button, `{colors.canvas-soft}` fill, `{colors.hairline-input}` border, shows an uploaded image, an initials letter (`{colors.primary-deep}`), or a placeholder `User` icon.

### Navigation

**`site-header`**
- Transparent, sits directly on the gradient mesh. Logo mark + wordmark (`{colors.primary-soft}`, `font-semibold`) on the left; nav links + a live clock on the right. No sign-in/CTA button in the header — auth lives in the hero card instead.

**`site-footer`**
- Plain white, 1px top `{colors.hairline}` border. Same logo lockup (smaller), nav links repeated, and a copyright line — no multi-column link farm.

### Pills, Tags, and Chips

**`pill-tag-soft`**
- Background `{colors.primary-subdued}`, text `{colors.primary-deep}`, `9px` uppercase, `font-medium`, padding `4px 8px`, rounded `{rounded.pill}`. Used for the project-card category tag ("tool").

### Signature Components

**Gradient Mesh Hero** — animated, blurred, layered radial blobs (cream/amber/seafoam/teal/emerald) confined to the hero band only; see Elevation & Depth above.

**`IconFlowBadge`** — a `{colors.canvas-soft}` rounded-square tile containing a Phosphor icon, with 3 faint animated SVG flow-lines (seeded pseudo-random paths) drifting behind it in a green→teal gradient stroke. The recurring leading visual for every card-grid item (values, specs, stack). Respects `prefers-reduced-motion` by freezing the gradient animation.

**`ValuesSpecsTabs`** — a centered pill-shaped tab switcher (Values / Specs / Stack) whose content fades in (`tab-fade-in`, 0.25s). Uniquely, mouse-wheel scroll near this section is intercepted: once the section nears viewport-center, wheel deltas accumulate and step through tabs before allowing the page to keep scrolling — a scroll-jacked stepper, not plain in-page tabs.

**Cream Interlude** (`bg-canvas-cream`) — a short, centered, copy-only band used once per page to create a tonal pause between the tab section and the footer.

**`ReceiptIllustration`** (project-card illustration) — a small hand-built inline SVG scene, the first non-icon illustration on the site. Composed of, in the site's existing green/mint/amber palette only: a receipt strip (white fill, `{colors.hairline}` stroke, zigzag torn bottom edge) with a few text-line strokes inside; a thin `{colors.primary-soft}` scan-beam bar that sweeps top-to-bottom on a loop, exactly matching the receipt's width so it never overhangs; a thin (`1.5px`) ink-colored camera-capture corner frame (4 independent corner brackets, generous ~10px gap from the receipt edge, vertically balanced so the frame sits centered in its box) around the whole receipt; and 6 total amber sparkle accents (4-point star shape, one large + 5 scattered smaller ones at varied size/opacity) that each blink independently on their own duration/delay so they twinkle out of sync. No background box — it sits directly on the card's canvas.
- This establishes the pattern for any future per-project illustration: flat-line SVG, brand palette only, one clear animated focal motion (the scan), thin strokes throughout, ink-colored (not primary-green) framing elements, and scattered blinking sparkle accents as the "AI/insight" motif. Reuse this recipe rather than introducing a new illustration style per project.

**`TreeIllustration`** (project-card illustration, "Jejaku Tree") — follows the `ReceiptIllustration` recipe exactly: a small family-tree diagram (root + children + grandchildren nodes, ink-colored connector lines, primary-soft node strokes) with one focal animated motion — a new branch drawing itself in and a new member node fading in with a pulsing focus ring, on a single synced 3.6s timeline (one `<g>` opacity envelope driving branch draw, node fade, and ring pulse together, not three independent animations). Same amber sparkle accents as the receipt illustration.

**`DigitGlobe`** (email-OTP step decoration) — a draggable, auto-rotating d3-geo orthographic sphere (same technique and ~264×211 footprint as Jejaku Receipt's `LocationHistoryCard` globe) filled with `{colors.canvas}` — the same background as the card it sits on, borderless, so the sphere reads only through its digits, not a colored blob. 640 single digits (`{colors.ink-mute}`) on a Fibonacci-lattice sphere (evenly spaced, not independently-random), only the front hemisphere rendered; size and opacity are recomputed every frame from each point's angular distance to dead-center of the visible hemisphere, so a bright/large "hot zone" sweeps across whichever digits are currently most face-on as the sphere rotates. Deterministic (mulberry32-seeded), not `Math.random()`, so server and client render the same layout. Also exposes an imperative `pickDigit(digit)` handle (`DigitGlobeHandle`) that the OTP form calls as each box is filled — finds the most-central visible point showing that digit, removes it from the sphere permanently, pauses auto-rotation for ~900ms, and returns its live screen position for a fly-to-input-box animation (see `FlyingDigit`). Auto-rotates continuously and pauses while dragged or mid-pick; no `prefers-reduced-motion` handling yet — add it if this pattern gets reused elsewhere.

### Roadmap Timeline
A vertical `{colors.ink-mute}` connector line with a dot per entry: filled `{colors.primary}` dot for anything with a `dateLabel` ("Started"/"Shipped"), outline `{colors.hairline-input}` dot for status `"Up next"`. Each entry: uppercase 12px status label, 16px medium title, 14px `{colors.ink-mute}` body, and a `.tabular` date line. New entries are prepended chronologically as work ships — this is the one place on the site with a running log/changelog feel.

**`link-on-light`**
- Text `{colors.primary}`, `13–15px`, `font-medium`, no underline, often paired with a trailing `ArrowRight` icon (project card "View project", hero "See the work").

## Do's and Don'ts

### Do
- Keep the gradient mesh confined to the hero band of a page — don't let it bleed into content sections below.
- Use `card-content-flat` (flat, bordered, no shadow) as the default container for any new card — don't invent a shadowed variant unless there's a specific floating/overlay use case.
- Render headline/card-title text at weight 300; keep buttons, labels, and nav at 400–500.
- Reserve `{colors.primary}` fill for exactly one CTA per view; everything else is outline, ghost, or plain text link.
- Respect `prefers-reduced-motion` on any new animated element — the mesh, `IconFlowBadge`, and tab fade-in all already do this; match that pattern.
- Apply `.tabular` to any numeric/measurement value (spec cards, future stats).

### Don't
- Don't add drop shadows to cards — the entire site is currently shadow-free by design.
- Don't introduce dashboard/product-UI mockup imagery — this is a personal/portfolio site, not a SaaS marketing page.
- Don't add a second filled-green button in the same view.
- Don't use `{colors.brand-dark-900}` or `{colors.citrine}` yet — they're reserved tokens with no shipped surface; if you use them, document the new surface here.
- Don't hardcode spacing to a strict 8px grid — match the existing arbitrary-but-consistent bracket values (23/30/46/61/91px etc.) already in use.

## Responsive Behavior

### Breakpoints (Tailwind defaults as actually used)
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px (`md`) | 1-col grids everywhere; hero stacks; header clock hidden |
| Tablet | 768–1023px (`md`–`lg`) | Projects 2-col; values/specs/stack 3-col already applies at `md` |
| Desktop | ≥ 1024px (`lg`) | Hero becomes 2-col (copy + auth card side-by-side); projects 3-col; header padding increases to 30px |

### Touch Targets
- All buttons and text inputs are a fixed `37px` tall — slightly under the 44px AAA target; acceptable here given generous horizontal padding and the low-stakes, non-transactional nature of the actions (nav, auth, form submit).

### Collapsing Strategy
- Hero headline steps 38px → 53px at `md`.
- Card grids step 1 → 2/3 columns at `md`, projects additionally steps to 3 at `lg`.
- No separate mobile art-direction crops exist — there are no photographic/mockup images to crop.

## Iteration Guide

1. Focus on ONE component at a time and check `app/components/` for an existing pattern before inventing a new one — most needs are already covered by `card-content-flat`, `IconFlowBadge`, or the pill-button styles.
2. Reference real Tailwind arbitrary values already in use (e.g. `text-[19px]`, `tracking-[-0.19px]`, `p-[30px]`) rather than inventing new round numbers — consistency here matters more than a clean token scale.
3. Keep `ss01` global and `.tabular` applied per-numeric-element only.
4. New sections should default to flat white/`{colors.canvas-soft}` — only the very top of the page gets the gradient mesh.
5. If a component needs real elevation (shadow) or a dark inverted surface, that's a genuine new pattern for this site — call it out explicitly rather than quietly adding a `box-shadow`.
6. Always test new interactive/animated components against `prefers-reduced-motion`, matching the mesh/`IconFlowBadge`/tab-fade precedent.
</content>
