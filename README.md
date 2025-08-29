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

First, the app won't do much unless you have an API running at http://localhost:8080 (see https://github.com/folded-ear/gobrennas-api).

Then start the client with `pnpm run dev`.

Open [http://localhost:4000](http://localhost:4000) with a browser to see the result.

## Testing

Unit tests are set up with vitest and can be run with `pnpm test` (or `pnpm run test`).

## Storybook

There is a storybook instance to browse the project component library and pages. It can be run with `pnpm run storybook`

## Build

Run `pnpm run build`

Now you'll have a nice ready-to-deploy website in the `build` directory! And
it's useless without an API to connect to.

## Local Development

### Adding new components

The component library is based on using [shadcn](https://ui.shadcn.com/) to create new components. Rather than a library where a whole suite of components are imported at once, this system generates a component into the code base via either a CLI or simply cut-and-paste via a standard pattern. Under the hood, a headless component (in most cases, [RadixUI](https://www.radix-ui.com/)) is installed as a dependency, styled with defaults.

The components are managed independently and can be customized at will.

### Tailwind

[Tailwind](https://tailwindcss.com/) is the css solution, along with Tailwind Variants for easily managing style variants. I dunno -- I am still learning it myself so I'll let you know how it goes.
