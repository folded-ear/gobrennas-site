# Technical stack

This page records the main technical choices in the site. `package.json` is the
source of truth for exact versions.

| Concern | Choice | Where to look |
| --- | --- | --- |
| Application framework | Next.js App Router with React Server Components | `app/`, `next.config.ts` |
| Language | TypeScript in strict mode | `tsconfig.json` |
| API | GraphQL | `schema.graphql`, `src/**/*.gql` |
| GraphQL client | Apollo Client with Next.js integration | `src/lib/apollo*` |
| Generated GraphQL types | GraphQL Code Generator and typed document nodes | `codegen.ts`, `src/**/__generated__/` |
| UI components | HeroUI | `package.json` |
| Forms and validation | React Hook Form with Zod via `@hookform/resolvers` | `docs/forms-and-validation.md` |
| Styling | Tailwind CSS with Tailwind Variants | `app/globals.css` |
| Theme | CSS variables using OKLCh colors; light and dark modes through `next-themes` | `app/globals.css`, `src/providers/theme-provider.tsx` |
| Icons | Lucide | `package.json` |
| Drag and drop | dnd-kit | `src/features/plan-dnd/` |
| Service worker | Serwist, through its Turbopack route | `app/serwist/[path]/route.ts`, `src/worker/` |
| Browser storage | IndexedDB through `idb` | `src/features/page-engine/store.ts` |
| Tests | Vitest, jsdom, and Testing Library | `vitest.config.ts`, `src/test/setup.ts` |
| Font | Figtree | `app/globals.css` |

The reasons behind a durable choice belong in a decision record, not in this
inventory. Use the [decision template](../templates/decision.md) when the reason
will matter to future changes.
