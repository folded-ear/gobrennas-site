# Loading and error conventions

How the site shows that something is happening, that nothing is there, or that
something went wrong. These rules apply across features. Follow them by default;
depart from them only for a reason worth writing in the pull request.

This document describes the target state. The known gaps at the end record where
the current implementation does not follow it yet.

Related: [design tokens](design-tokens.md) for colors and spacing,
[testing conventions](testing.md) for asserting on these states.

## Loading

### Choose the boundary by route group

| Route group | Default | Why |
| --- | --- | --- |
| `app/(private)/**` | Cover every route with an appropriate `loading.tsx` boundary | Application navigation should respond immediately; complete initial HTML is not a product requirement for these screens. |
| `app/(public)/**` | Decide per route; default to no `loading.tsx` until progressive rendering improves the experience | Streaming remains server-rendered and does not inherently harm SEO. Use blocking only when the route has a concrete complete-response requirement. |

### Rules

1. **Every route under `(private)` is covered by a `loading.tsx`.** A shared
   `app/(private)/loading.tsx` can provide the default; add a closer boundary
   when a route needs a more specific fallback. Without a boundary, the previous
   page can remain on screen until the new route is ready.
2. **A query in a layout gets its own `<Suspense>`.** A page's `loading.tsx`
   does not cover the layout in the same segment. Wrap the part that suspends or
   move its data access below the route boundary so it does not gate the whole
   shell.
3. **Add `<Suspense>` inside a screen when part of the screen should stay put.**
   When the recipe library gets its loading treatment, its filter controls
   should remain interactive while results load, so the boundary belongs around
   the grid rather than the whole screen. This is in addition to `loading.tsx`,
   not instead of it — see below.
4. **Pagination does not replace existing content with a Suspense fallback.**
   Keep the list visible and show progress beside it. If `useTransition` wraps
   asynchronous work, return or await the request so its pending flag spans the
   request, and always handle rejection explicitly.
5. **Skeleton when the shape is known, spinner when it isn't.** A list or a
   detail screen has a predictable shape, so it gets a skeleton that matches it.
   A button mid-mutation or an indeterminate wait gets a spinner.
6. **Keep a skeleton next to what it stands in for.** When
   `RecipeCardSkeleton` is added, it belongs beside `RecipeCard` so the two
   change together.
7. **Every `useSuspenseQuery` has a boundary above it, or a comment saying why
   not.** The absence of a boundary is a decision and should read like one.

### Why `loading.tsx` and `<Suspense>` are not interchangeable

They are the same React primitive doing two different jobs.

`loading.tsx` is a boundary **the router can see without rendering the page**.
That lets Next partially prefetch a dynamic route through the first loading
boundary. A `<Suspense>` inside a screen still controls streaming, but it cannot
serve as the router's prefetched route fallback.

So: `loading.tsx` answers "what does the user see when they click?" and
in-screen `<Suspense>` answers "which parts of this screen stream
independently?" Most private routes want both.

### Streaming remains server rendered

Adding `loading.tsx` lets Next send fallback UI before the final content is
ready. The resolved content is still rendered on the server and streamed in the
same response; the boundary does not turn the screen into client-only content.

Automatic link prefetching is enabled only in production, so assess its
navigation benefit with a production build rather than development timings.

## Empty states

An empty state is not an error and does not look like one. It says what is
missing and, where there is one, offers the action that fills it.

- Use a shared empty state component rather than an inline string.
- Distinguish "you have none yet" from "none matched this filter." The first
  invites an action; the second invites changing the filter.
- Empty is a normal outcome. Never route it through an error boundary.

## Errors

### Where boundaries go

| Boundary | Catches |
| --- | --- |
| `app/global-error.tsx` | Errors thrown by the root layout itself |
| `error.tsx` at a route group or segment | Its page and nested children, but not the layout or template in the same segment |
| `ErrorFallback` (client) | Client render errors below the mounted boundary |

`app/layout.tsx` currently wraps children in a single client
`react-error-boundary`. It cannot catch an error thrown while the root layout is
rendering because the boundary has not mounted yet.

### Rules

1. **Show a person a sentence, not an exception.** Raw error text belongs in the
   console and in development builds, not in the primary message.
2. **Every error state offers a way out** — retry, go back, or a link to
   something that works.
3. **Errors the user caused by acting get a toast.** A failed mutation the user
   triggered is transient and belongs near the action, not in a page-level
   boundary.
4. **Errors bound to a place get an inline `Alert`.** Anything tied to a field,
   a form, or one region shows there, where the thing that failed is.
5. **Never swallow a mutation error.** Every mutation handles failure
   explicitly. Silence is the current behavior and it is a bug, not a pattern.
6. **Authentication is not an error condition.** An expired or missing session
   is a routing outcome, not something for an error boundary to interpret.

### Known gaps

These are recorded because the code does not match the rules above yet.

- Private routes have no frontend authorization redirect. `getUserProfile()`
  maps `UNAUTHORIZED` to `undefined`, but descendant queries can still fail
  during server rendering. The client-only `UNAUTHORIZED` → login fallback
  cannot reliably turn a hard-load server error into navigation.
- `src/features/send-to-plan/` calls its mutation with no error handling; a
  failure is an unhandled rejection with no user-visible feedback.
- `src/hooks/use-set-preference/` returns its mutation promise, but its current
  callers do not handle rejection or show a failure.
- `src/components/error-fallback.tsx` displays raw exception text to the user.
- No `loading.tsx`, `error.tsx`, or `global-error.tsx` exists anywhere in
  `app/`.
- The recipe library has no in-screen boundary around `RecipeGrid`, and its
  loading skeletons have not been built yet.
- `src/features/recipe-grid/` does not return the `fetchMore()` promise from its
  transition or handle a pagination failure, so its pending state may not span
  the request.
- Empty states are ad hoc: `src/screens/planner.tsx` has an inline block and
  `src/features/recipe-grid/index.tsx` ends a list with the string `"fin."`.

## Open questions

Not yet decided. Do not invent an answer to these.

- Where the `UNAUTHORIZED` → login redirect belongs. A request filter in
  `src/filters/` is one option, but enforcing authentication there is an
  architectural change and needs agreement first.
- Whether toasts warrant a shared mutation wrapper or explicit per-call
  handling. This overlaps with the mutation and cache-update pattern (BFS-32).
