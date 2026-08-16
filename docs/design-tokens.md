# Design tokens

Source of truth: [`app/globals.css`](../app/globals.css). This doc explains what each
token is *for* and how to use it — for the actual OKLCh values, read the CSS
directly rather than trusting numbers copied here, since they'll drift.

Every token is overridden per light/dark mode in `:root`/`.light` and `.dark`
blocks, then re-registered in Tailwind's `@theme` (either by `@heroui/styles`
itself, or by us for the aliases below) so they're usable as `bg-*`, `text-*`,
`border-*` utilities. `next-themes` toggles a `dark` class on `<html>`
(`attribute="class"` in [`theme-provider.tsx`](../src/providers/theme-provider.tsx)),
which is what flips every token over.

**Rule of thumb for new features: reach for a token utility (`bg-surface`,
`text-danger`, `border-border`, …) before reaching for a hex code or an
arbitrary Tailwind color like `bg-orange-500`.** Hardcoded colors don't move
when the brand palette changes or when the user is in dark mode.

## Color tokens

These come from HeroUI v3's own token system (`@heroui/styles`); our
`globals.css` overrides their values to match the brand, it doesn't invent new
names except where noted.

| Token | Utility classes | Use for |
|---|---|---|
| `background` | `bg-background` | Page background |
| `foreground` | `text-foreground` | Default text color |
| `surface`, `surface-secondary`, `surface-tertiary` | `bg-surface*` | Cards, accordions, disclosure panels — non-overlay content containers, in increasing contrast steps |
| `overlay` | `bg-overlay` | Floating content: tooltips, popovers, modals, menus |
| `accent` (aliased as `primary`) | `bg-accent` / `bg-primary` | The brand color — primary buttons, links, focus rings |
| `default` (aliased as `secondary`) | `bg-default` / `bg-secondary` | Neutral secondary actions (secondary buttons, chips) |
| `success` / `warning` / `danger` | `bg-success`, `bg-warning`, `bg-danger` | Semantic status: confirmations, cautions, errors/destructive actions |
| `muted` | `text-muted` | De-emphasized text (helper text, captions) |
| `border` / `separator` | `border-border`, `border-separator` | Component borders vs. layout dividers |
| `field-*` | n/a — used internally by HeroUI form components | Input/field backgrounds, borders, placeholders |

Each color token also has a `-foreground` pair (e.g. `accent-foreground`) for
text/icons placed on top of that color, and most have a `-hover` and `-soft`
variant generated automatically by HeroUI's theme layer via `color-mix()` —
you don't need to define those yourself.

### `primary` / `secondary` aliases

HeroUI doesn't have `primary`/`secondary` tokens — it uses `accent` for the
one brand action color and `default` for neutral/secondary actions. We alias
`--color-primary` → `--accent` and `--color-secondary` → `--default` in the
`@theme` block in `globals.css` purely so the conventional names are
available too. **Don't give them independent values** — if the brand color
changes, change `--accent`, not `--primary`.

## Spacing scale

Custom scale in `@theme`, in addition to Tailwind's default spacing:

`--spacing-none` (0) · `--spacing-xxs` (2px) · `--spacing-xs` (4px) ·
`--spacing-sm` (8px) · `--spacing-md` (12px) · `--spacing-lg` (16px) ·
`--spacing-xl` (24px) · `--spacing-xxl` (40px)

Used as e.g. `p-md`, `gap-xl`. Prefer these named steps over Tailwind's
numeric scale (`p-3`, `gap-6`) when the numeric value doesn't map cleanly —
they read as intent (`sm`/`md`/`lg`) rather than a magic number.

## Typography

Font is Figtree (`--font-figtree`, mapped to `--font-sans`). Tailwind's
default `text-*` size scale (`text-sm`, `text-3xl`, etc.) is used as-is — we
haven't overridden it — but headings get default styling in `@layer base` in
`globals.css` so semantic HTML is distinguished from body copy without
needing utility classes on every heading:

| Tag | Size | Weight |
|---|---|---|
| `h1` | `text-3xl` | bold, tight tracking |
| `h2` | `text-2xl` | semibold, tight tracking |
| `h3` | `text-xl` | semibold |
| `h4` | `text-lg` | semibold |
| `h5` | `text-base` | semibold |
| `h6` | `text-sm` | semibold, uppercase, wide tracking |
| body / `p` | `text-base` | regular |
| `small` | `text-sm`, muted color | regular |

Use the plain tag (`<h2>Section title</h2>`) rather than re-picking
`text-*`/`font-*` classes per component. If a heading needs to look like a
different level than its semantic level (e.g. an `<h2>` styled like an h3 for
document-outline reasons), override with utilities on that instance —
don't change the base rule.

## Border radius

`--radius` (0.5rem) is the base HeroUI uses to derive `--radius-xs` through
`--radius-4xl` via `calc()`. We also expose flat aliases (`--radius-xs`
through `--radius-xl`) tied to the spacing scale for components that want a
spacing-matched radius directly.

## Seeing it live

[`/sandbox`](../app/sandbox/page.tsx) has a "Foundations" section at the top
showing every color token as a labeled swatch and the full heading/body type
scale, plus a catalog of HeroUI components below so you can sanity-check that
components pick up the theme without per-component overrides. Toggle
light/dark with the switch at the top of the page.
