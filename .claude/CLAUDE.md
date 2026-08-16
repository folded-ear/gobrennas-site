# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brenna's Food Software is a Next.js-based recipe and meal planning application. The frontend communicates with a separate GraphQL API (see https://github.com/folded-ear/gobrennas-api) for all data operations.

This repo is the active target of a migration off the legacy frontend, `gobrennas-client` (sibling repo at `../gobrennas-client`, a Vite SPA). See "Migrating from gobrennas-client" below.

## Essential Commands

### Development
- `pnpm install` - Install dependencies (requires pnpm package manager)
- `pnpm run dev` - Start development server on http://localhost:4000 with Turbopack
- `pnpm run generate` - Generate TypeScript types from GraphQL schema and operations (runs automatically before dev/build/tsc)

### Testing and Quality
- `pnpm test` - Run unit tests with Vitest
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run lint` - Run ESLint (fails if any warnings)
- `pnpm run format` - Format code with Prettier
- `pnpm run tsc` - Type-check without emitting files

### Build and Deploy
- `pnpm run build` - Build production application (generates standalone output)
- `pnpm run start` - Run production server from `.next/standalone/`

## Environment Setup

1. Copy `.env.example` to `.env`
2. Default configuration expects API at `http://localhost:8080` and app at `http://localhost:4000`
3. Both frontend and API must be running for full functionality
4. The app uses Google OAuth2 for authentication via the API

## Architecture

### Next.js App Router Structure

The project uses Next.js 16 App Router with route groups:

- `src/app/(private)/` - Authenticated routes (recipes, planner, pantry, shopping, profile)
- `src/app/(public)/` - Public routes (login, share, OAuth callback)
- Route groups affect layout hierarchy but not URL paths

Private route structure:
- `/recipes` - Recipe list/grid with detail and edit sub-routes
- `/planner` - Planner with `/calendar`, `/list`, and `/schedule` sub-routes
- `/pantry`, `/shopping`, `/profile`

### GraphQL Integration

**Code Generation Workflow:**
1. GraphQL schema file: `schema.graphql` (at project root)
2. GraphQL operations: Defined in `.gql` files alongside components/data modules
3. Code generation: `pnpm run generate` creates:
   - `src/__generated__/graphql.ts` - Base types from schema
   - `src/**/__generated__/` - Operation-specific types and typed document nodes near source files
4. The `pregenerate` script removes all `__generated__/` directories before regenerating

**Client Setup:**
- Apollo Client 4.x with Next.js integration (`@apollo/client-integration-nextjs`)
- Shared browser/SSR client: `src/lib/apollo-browser-and-ssr.tsx`
- RSC-specific client: `src/lib/apollo-rsc.ts`
- Apollo cache and link config: `src/lib/apollo/` (build-apollo-link.ts, build-in-memory-cache.ts, possible-types.ts)
- Authentication via `FTOKEN` cookie passed to API

### Middleware and Filters

The project implements a custom filter chain pattern for middleware in `src/proxy.ts`:
- Chain of responsibility pattern for request/response processing
- Filters can preprocess requests, transform responses, or short-circuit the chain
- Current filters: Cloud Run health probes, device key cookie management
- Filter implementations live in `src/filters/`
- Add new filters by implementing the `Filter` type and registering in `buildFilterChain()`

### UI Component System
- UI library: HeroUI (@heroui/react) 3.x

**Styling:**
- Tailwind CSS 4.x configured via `globals.css` (no separate `tailwind.config.ts`)
- Theme uses OKLCh color space with CSS variables; custom spacing scale defined in `@theme`
- Font: Figtree (configured as `--font-figtree`)
- Dark mode support via `next-themes`
- Tailwind Variants for component variant management
- Path alias: `@/` maps to `src/`

### Data Layer Conventions

- `src/data-rsc/` - React Server Component data fetching modules (recipe metadata, user profile, auth check)
- `src/hooks/` - Custom React hooks (user preferences)
- `src/providers/` - React context providers (theme)
- Feature-specific GraphQL operations live in `.gql` files alongside components

### Key Dependencies

- **Framework:** Next.js 16 with App Router and React Server Components
- **GraphQL:** Apollo Client 4.x with typed-document-node codegen
- **Styling:** Tailwind CSS 4.x, Tailwind Variants, Framer Motion
- **UI Components:** HeroUI 3.x, Lucide icons
- **Testing:** Vitest with jsdom and Testing Library
- **Font:** Figtree

## Migrating from gobrennas-client

`gobrennas-client` is the legacy frontend being replaced by this repo. When porting a feature:

- **Port business logic and UX behavior, not code structure.** This is a rewrite, not a copy-paste. Re-derive the implementation using this repo's conventions (below); don't transplant the old component tree, state shape, or file layout.
- **Read the old repo for what the feature does and how it should feel to use** — edge cases, validation rules, interaction details — not for how it was coded.
- Stack mapping, for context when comparing the two repos:

  | gobrennas-client | gobrennas-site |
  |---|---|
  | Vite SPA + react-router | Next.js 16 App Router |
  | MUI + Emotion | HeroUI + Tailwind CSS 4 |
  | Flux stores + immutable.js | Apollo Client cache / RSC data fetching |
  | `src/features/<PascalCase>/` | `src/features/<kebab-case>/` |

## TypeScript Configuration

- Path alias `@/*` resolves to `src/*`
- Vitest globals enabled in tests
- Target: ES2017
- Strict mode enabled

## Testing

- Test files: `*.test.tsx` in any directory
- Setup file: `src/test/setup.ts`
- Environment: jsdom
- Vitest with Testing Library for React components

## Project Tracking

Migration work is tracked in Linear (Go Brennas workspace, team "Go Brennas").