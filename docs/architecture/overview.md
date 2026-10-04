# Site architecture

GoBrennas is a Next.js application backed by the separate `gobrennas-api`
GraphQL service. The site owns rendering and browser interaction. The API owns
persistent application data and business operations.

## Application structure

Routes use the Next.js App Router under `app/`:

- `app/(private)/` contains authenticated routes for recipes, the planner, the
  pantry, shopping, and the user profile.
- `app/(public)/` contains login, OAuth callback, and other public routes.
- Route groups choose a layout but do not appear in the URL.

Route pages stay thin. A page renders a component from `src/screens/`, and a
screen composes components from `src/features/`:

```text
app route -> screen -> feature components -> GraphQL API
```

Shared UI belongs in `src/components/`. Shared hooks and providers belong in
`src/hooks/` and `src/providers/`. Feature-specific code stays together under
`src/features/<feature-name>/`.

Recipe ingredient, direction, and section displays in
`src/features/recipe-ingredients-and-directions/content.tsx` take plain content
props. The library's fragment-reading components adapt saved recipe data to
these displays. Cook adapts planned items and their cooking links to the same
displays, using planned notes before saved directions. It reads the plan’s full
item graph, including retained completed prep, through `updatedSince(0)`; the
scheduling tree alone omits those items. Each view retains its own actions.
Recipe detail and the editor share deletion and cache cleanup through `src/features/recipe-form/use-delete-recipe.ts`.

## Navigation shell

`app/(private)/layout.tsx` renders the page, the bottom section nav
(`src/features/section-nav/`, driven by its `SECTIONS` list), and an
`@screen` parallel-route slot.

Content that slides in over a page renders in `Screen`
(`src/components/screen.tsx`). A screen closes only by going back in
history, so it opens by adding a history entry in one of two ways:

- A routed screen is an intercepting route under `app/(private)/@screen/`,
  such as `(.)recipes/[id]`. Loading the same address directly renders the
  full page route instead. `@screen/[...rest]` clears the slot on navigation
  elsewhere.
- A screen without a route keeps what it shows on its own history entry with
  `useHistoryState` (`src/hooks/use-history-state/`), as the planner does for
  the open plan item.

Preferences such as selected plans are per-device values stored by the API.
They are never part of a URL.

## GraphQL data

The root `schema.graphql` and `schema-local.graphql` files define the schema
used by the site. Operations live in `.gql` files beside the code that uses
them.

`pnpm run generate` creates the base schema types in
`src/__generated__/graphql.ts` and operation-specific types in nearby
`__generated__/` directories. Generated files are replaced on each run and
must not be edited by hand.

Apollo has two client environments:

- `src/lib/apollo-rsc.ts` is used by React Server Components.
- `src/lib/apollo-browser-and-ssr.tsx` is shared by browser rendering and SSR.

Both use the cache and link builders in `src/lib/apollo/`. Authentication is
passed to the API with the `FTOKEN` cookie. More detail about query timing,
fragment masking, and the device key is in the project [README](../../README.md#data-fetching).

## Plan sync and offline use

Plan changes, polling, and the page's connection status go through one
sync engine per page (`src/features/plan-sync/`). Its state changes only in
a pure `step` function, one event at a time; a runner carries out what each
step asks for, keeps the engine's one timer, and alone listens to the
browser's events for it.

- A change shows at once through cache read policies (`overlay.ts`) that lay
  pending changes over the server's data, which is never edited to show
  one.
- Changes are kept in IndexedDB until the server answers, and each page
  load sends only its own, adopting a closed page's through a Web Lock.
- At most one request is out at a time, send or poll, so a poll never
  straddles a save's answer; an answered change stays shown until a later
  poll covers its plan.
- Mounted screens tell the engine which plans to poll (`useWatchPlans`).
- The section header's status (`src/features/sync-status/`) reads the
  engine.

The service worker (`src/worker/`, built by Serwist's Turbopack route in
`app/serwist/[path]/route.ts`) precaches the build and a static offline
page, and keeps the last good `/shopping` page. A shopping launch that
can't reach the server gets that page, and the engine puts its newer
snapshot of the cache, kept in IndexedDB, over the page's data.

## Request filters

The root `proxy.ts` builds a filter chain from the filters in `src/filters/`.
A filter can inspect a request, stop processing, or modify the response. Add a
new filter by implementing the `Filter` type and registering it in
`buildFilterChain()`.

## Migration from the legacy client

`gobrennas-client` is the legacy Vite application being replaced by this site.
Use it to understand behavior, edge cases, and interaction details. Do not copy
its component tree, state shape, or file layout into the new application.

| Legacy client | Current site |
| --- | --- |
| Vite SPA and react-router | Next.js App Router |
| MUI and Emotion | HeroUI and Tailwind CSS |
| Flux stores and immutable.js | Apollo Client cache and RSC data fetching |
| `src/features/<PascalCase>/` | `src/features/<kebab-case>/` |
