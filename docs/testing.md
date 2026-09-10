# Testing conventions

Stack: Vitest + jsdom + Testing Library (`vitest.config.ts`, `src/test/setup.ts`).

## What gets tested

- **Every feature component gets a render test** — mount it with realistic
  props/fragment data and assert on what a user would see.
- **Critical interactions get a behavior test** — clicks, form submits, and
  conditional branches that change what's on screen (loading states, empty
  states, error states). Not every prop combination needs its own test; cover
  the paths that matter to the user, not every branch in the code.
- Use `userEvent`, not `fireEvent`, for interactions — it simulates the full
  event sequence a real user triggers (focus → mousedown → mouseup → click),
  not just a single synthetic event.
- Query by role/label/text (`screen.getByRole`, etc.), not `data-testid`.
  Reaching for a test ID is a sign the component itself isn't accessible —
  fix that first.
- **Pure functions and hooks get plain tests, no Testing Library.** Not
  everything in a feature directory is a component (e.g.
  `recipe-card/utils.ts`) — a plain `it`/`expect` against the exported
  function is enough. No `render`, no cache, no mocks. Same co-location
  rule applies: `utils.ts` → `utils.test.ts`.

## Guidance for AI-authored tests

Most of these tests will be written by an AI assistant. The failure modes
worth guarding against are different from the ones a human writing their own
tests runs into:

- **No tautological tests.** Don't write the implementation, then write a
  test that asserts whatever that implementation happens to do — it'll pass
  immediately and prove nothing. A test should assert the behavior implied
  by the ticket/spec, independent of how it got implemented. If a test can't
  fail given a plausible bug, it isn't testing anything.
- **A render test asserts specific visible content, not just "didn't
  throw."** `render(<Foo />)` with no further assertion (or a bare
  `toBeTruthy()` on the container) satisfies "every component gets a render
  test" on paper while checking nothing. Assert an actual name, label, role,
  or piece of text.
- **Realistic, typed mock data.** Type fragment/mutation literals against
  the generated `XFragment`/`XMutation` types rather than casting through
  `any`, and use plausible values, not `"test"` / `"foo"` everywhere. Loose
  mocks let a test pass while masking a real shape mismatch.
- **A test must be run and shown passing before it's considered done.**
  Don't hand off an assertion that looks plausible but was never executed —
  run `pnpm test` (and check the specific new test actually ran, not just
  that the suite was green) before calling the work finished.

## Rendering a component

Import `render`, `screen` and `userEvent` from `@/test`, not from
`@testing-library/react`:

```tsx
import { buildInMemoryCache, render, screen, userEvent } from "@/test";
```

`@/test` re-exports all of Testing Library, overriding `render` with one
that wraps the component in the providers the app really wraps its client
tree in — Apollo backed by the app's own cache, and the theme provider. A
component under test therefore finds the same context it finds in
production, and no test has to know which providers a component needs.

## Mocking GraphQL

Put the cache in the state the app would have put it in, then render
against it. `render` takes the cache and builds a client around it that
matches production — masked, with local state and a mock link.

**Component reads fragment data.** Seed the fragment and pass what
`seedFragment` gives back. It writes the data and returns the reference
the component takes as a prop, so the two can't drift apart:

```tsx
const cache = buildInMemoryCache();
const pie = seedFragment(cache, PlanItemFragmentDoc, "planItem", PUMPKIN_PIE);

render(<PlanItem item={pie} />, { cache });
```

Passing a fragment-shaped literal straight in as the prop does not work,
and fails quietly: the component renders empty and a loose assertion still
goes green. `useFragment` resolves its argument through the cache by
identity rather than reading it, so data that was never seeded isn't
there. Seed it.

A fragment that doesn't select `id` can't be identified, so pass a cache
id: `seedFragment(cache, doc, "userAvatar", data, { id: "User:1" })`. It
throws and tells you so rather than rendering blank. `variables` goes in
the same options, for a fragment whose own fields take arguments.

**Anything else the cache needs**, write directly — `cache.writeQuery` to
warm a screen's query the way `sidebar.test.tsx` does, `cache.writeFragment`
for a shape `seedFragment` doesn't cover, `cache.readFragment` to assert on
what a component wrote. `seedFragment` is a convenience over the cache, not
a gate in front of it; the cache's own API stays available.

**Component runs its own query or mutation.** Pass `mocks` — request and
variables in, result out, matched against the operations the component
fires:

```tsx
render(<SendToPlan recipeId={recipeId} activePlanId={planId} />, {
  mocks: [
    {
      request: { query: DoSendToPlanDocument, variables: { recipeId, planId } },
      result: { data: { library: { sendRecipeToPlan: { id: "1" } } } },
    },
  ],
});
```

We're not using msw (nothing needs network-level mocking yet — everything
goes through Apollo) or codegen'd mock data (unnecessary indirection at
this size). Revisit if either need becomes real.

## File location and naming

Co-located, matching the filename under test: `index.tsx` → `index.test.tsx`.
This tightens the general "`*.test.tsx` anywhere" pattern into an actual
convention.

## Coverage threshold

None enforced yet. `pnpm run test:coverage` stays a visibility tool —
enforcing a number against a near-empty suite would be meaningless. Revisit
once more features have real tests.
