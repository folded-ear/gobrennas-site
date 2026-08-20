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
  function is enough. No `render`, no `MockedProvider`. Same co-location
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

## Mocking GraphQL

Two situations, two approaches:

**Component takes fragment data as a prop** (most presentational
components — `RecipeCard`, `UserAvatar`, `PlanItem`) — no provider needed.
Data masking means the generated `XFragment` type is really just the
selection's plain object shape at runtime, so construct a literal matching
it and pass it straight in:

```tsx
const recipe: UserAvatarFragment = {
  name: "Ada",
  email: "ada@example.com",
  imageUrl: null,
};

render(<UserAvatar user={recipe} />);
```

**Component runs its own `useQuery`/`useMutation`, or reads from
`ROOT_QUERY`** (e.g. `SendToPlan`) — wrap it in `MockedProvider` from
`@apollo/client/testing/react`. Mocks are request/variable → result pairs,
matched against the actual operations the component fires:

```tsx
render(
  <MockedProvider
    mocks={[
      {
        request: { query: DoSendToPlanDocument, variables: { recipeId, planId } },
        result: { data: { library: { sendRecipeToPlan: { id: "1" } } } },
      },
    ]}
  >
    <SendToPlan recipeId={recipeId} activePlanId={planId} />
  </MockedProvider>,
);
```

If a component reads a fragment `from: "ROOT_QUERY"` (data some ancestor
query would normally have already put in the cache), seed that directly with
`cache.writeFragment({ id: "ROOT_QUERY", fragment, fragmentName, variables, data })`
on a cache passed via `MockedProvider`'s `cache` prop — see the worked
example.

We're not using msw (nothing needs network-level mocking yet — everything
goes through Apollo) or codegen'd mock data (unnecessary indirection at this
size). Revisit if either need becomes real.

## File location and naming

Co-located, matching the filename under test: `index.tsx` → `index.test.tsx`.
This tightens (doesn't replace) the existing "`*.test.tsx` anywhere" rule in
`CLAUDE.md` into an actual convention.

## Coverage threshold

None enforced yet. `pnpm run test:coverage` stays a visibility tool —
enforcing a number against a near-empty suite would be meaningless. Revisit
once more features have real tests.
