# Brenna's Food Software UI

Do you use food? Do you use software? Brenna's Food Software is for you!

> Your _face_ is a ~~cookbook~~ food software!

## Dependencies

- Node >=20
- pnpm as the package manager

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

The easiest way to get the correct version of node is to use `nvm` (see https://github.com/nvm-sh/nvm ) then `nvm install` and `nvm use` to set.

If you don't already have `pnpm` installed globally as the package manager, you can enable it (assuming you have the correct version of node above) by running `corepack enable pnpm`.

Then, install all the project dependencies with `pnpm install`.

## Run the app

First, the app won't do much unless you have an API (see https://github.com/folded-ear/gobrennas-api) running as well. You'll also need to copy `.env.example` to `.env`, updating the values if you changed any default configuration.

Then start the client with `pnpm run dev`.

Open [http://localhost:4000](http://localhost:4000) with a browser to see the result.

## Testing

Unit tests are set up with vitest and can be run with `pnpm test` (or `pnpm run test`).

## Build

Run `pnpm run build`

Now you'll have a nice ready-to-deploy website in the `build` directory! And
it's useless without an API to connect to.

## Local Development

### Tailwind

[Tailwind](https://tailwindcss.com/) is the CSS solution, along with Tailwind Variants for easily managing style
variants. I dunno -- I am still learning it myself, so I'll let you know how it goes.

### Data Fetching

Apollo Client is used both server- and client-side for accessing the GraphQL API, and is complicated by the fact that
Next.js is in the mix. There are two separate Apollo environments:

1. React Server Components (RSC) - this uses the client configured in `apollo-rsc.ts`, and acts like any ol' server-side
   language (JSP, PHP, CFML, ASP, etc.). Data is loaded during processing, used to create some HTML, and then discarded
   when the HTML is sent back across the network. This is the correct mental model, even though RSC adds trickery via
   the "RSC Payload". Basically, React can render some HTML on the server, send it down to the browser where the React
   app is already loaded, and jam the server-rendered HTML into the existing React-managed DOM without a full page
   refresh. This maintains client state across "page navigations". At any point you can always refresh the browser to
   get the actual HTML across the wire.
1. In-Browser - this uses the client configured in `apollo-browser-and-ssr.ts`, and as the filename suggests, is used
   for server-side rendering (SSR) of the client application. SSR is an optimization of what happens in the browser - it
   is NOT a server-side language. Data loaded during SSR _remains available in the browser_, and is never available to
   RSCs.

In general, a given field should only be used on one side or the other: either you need it to statically render
something, or you need it to be dynamic in the browser. If the same field is used both ways, the UI will end up
inconsistent if its value changes: the RCS-generated HTML will remain the same, while the client application will
reflect the update.

Further, RSC should do very little data access. Brenna's Food Software is an application (not a website) so nearly all
content is dynamic. Next.js is biased towards websites with a little bit of dynamic behavior, not client applications.
RSC makes a couple important contributions: fully-static HTML for search engines and third-party unfurls is the big one,
since Next.js can detect these cases and "move" SSR into the RSC step automagically.

### Query Timing

For RSC, there is only one answer: it's always a promise. Period. Issue the query, `await` the result, render the tree,
and once everything's done, the HTML goes across the wire.

In the browser it's quite a bit more complicated. Three main approaches:

1. `useQuery` - only available in client components. When the component is hydrated in the browser, the query is issued,
   and Apollo does it's thing.
1. `useSuspenseQuery` - only available in client components. When the component is SSRed, the query is issued and
   suspended. Before the SSR pass is complete, the result will be provided and the component rendered. When the
   component is hydrated in the browser, both it's HTML _and_ the query result will be present.
1. `useSuspenseQuery` with `<Suspense>` - only available in client components. When the component is SSRed, the Suspense
   boundary will be triggered, and that will be sent to the client. The query result will be streamed down, and once
   loaded into the browser cache, the Suspense fallback will be removed and the component rendered with the result. "
   Streamed down" just means "in an RSC payload", which may be the same as the route change itself, or may come
   separately. The application doesn't care which, but a user might notice a difference.

But wait, there's more! Apollo also has `useBackgroundQuery` and `useReadQuery` hooks, which are a way to initiate a
query high in the component tree, but only suspend if another component tries to read the result before it's available.
This is entirely client-side, and useful to warm the cache based on user interactions, before the user actually requests
the data.

We're not done yet, because Apollo's RSC environment provides a `PreloadQuery` server component which Next.js can use to
initiate a query during RSC, and make the result available in-browser (via the RSC payload). Note that the server
components _cannot access the loaded data_. This is orthogonal to the three approaches outlined above, and seems to
mostly need a Suspense boundary. It's similar to `useBackgroundQuery`, but managed by RSC, rather than the client
application.

In general, `useSuspenseQuery` seems like the right fit for Brenna's Food Software. If you want rendered HTML across the
wire, don't use `<Suspense>` (SSR will wait until data is available). If you want the application skeleton fast, with a
spinner for the data, add a Suspense boundary (the waiting will happen on the client). Either way, the application
behaves as if you'd used the trusty ol' `useQuery` once the data is available, including using `fetchMore`, cache
updates, etc.

For data-heavy pages (i.e., _don't_ change routes), background/read queries provide a similar dichotomy. Hypothetically,
if we don't preload the entire plan tree, it might make sense to background-load every visible item's children, so if
the user expands it, they probably won't have to wait. That would then make a new set of items visible, and their
children would be background-loaded. If the user drills down _fast_, they'll still have to wait. If they bother to take
a breath, fetching should happen in the background, and perceived app performance should be similar to "preload the
entire tree" while drilling. The initial render, however, would be appreciably faster.

### Query Construction

Apollo provides a fragment registry and data masking based on fragments, which means the component tree itself can be
used to assemble queries. Each component which renders data has a fragment describing the data it wants. When the needed
data changes, update the component's fragment, and every place it's used the overarching query will automatically update
as well. The masking ensures that components can only use data they explicitly request, they can't "accidentally" use
data that is present because some other component requested it. This makes for a little bloat in the query, but not the
result, and maximizes the value of TypeScript.

For example, `UserAvatar` is a leaf component. It defines a `userAvatar` fragment (on `User`) for the fields it needs,
exposes that fragment as a constant, and registers it in `fragment-registry.ts`. The component's props require a
`FragmentType<UserAvatarFragment>`, which should be read as "any object loaded with the `userAvatar` fragment spread
within". That object is passed to the `useFragment` hook's `from` option, which provides the component with the
fragment's data, for whatever contextual user the parent component is concerned with.

The parent need only spread `userAvatar` into a user, and then pass the user (from its data) into `UserAvatar`. The
parent might be a non-leaf, fragment-rendered component, or it might be a top-level view (which owns the whole query).

Top-level views actually define a query operation, and use `useSuspenseQuery` instead of `useFragment`. There's no
fragment to export and register, as the query is an implementation detail. `RecipeDetail` is an example (which uses
`UserAvatar`).

#### Server vs Browser Queries

While the GraphQL operations are the same between server and browser, the module system is not. In the browser, all
relevant modules were bundled _at build time_ and are loaded as a single unit. On the server, Node does its normal
on-demand module resolution. Further complicating things, on the server there are three types of modules:
`"use server"`, `"use client"`, and unspecified/implicit/inherited. This has two primary impacts:

1. Fragments cannot be registered as side effects of module resolution. This is why `fragment-registry.ts` exists; all
   fragments will be registered before any queries are assembled, even if the module which uses the fragment hasn't been
   resolved yet.
1. Fragments cannot be defined in `"use client"` modules if they're used in a non-`"use client"` module, so client
   components usually cannot define their fragment constant in the same module as the component itself.
