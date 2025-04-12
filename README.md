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

First, The app won't do much unless you have an API running at http://localhost:8080 (see https://github.com/folded-ear/gobrennas-api):

Then start the client with `pnpm run dev`.

Open [http://localhost:3000](http://localhost:3000) with a browser to see the result.

## Testing

Unit tests are set up with vitest and can be run with `pnpm run test`

## Storybook

There is a storybook instance to browse the project component library and pages. It can be run with `pnpm run storybook`

## Build

Run `pnpm run build`

Now you'll have a nice ready-to-deploy website in the `build` directory! And
it's useless without an API to connect to.
