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

