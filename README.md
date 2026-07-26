# Shopify Accountancy — Frontend

![Node](https://img.shields.io/badge/node-24-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.5.0-F69220?logo=pnpm&logoColor=white)
![Vite](https://img.shields.io/badge/vite-8-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/typescript-6-3178C6?logo=typescript&logoColor=white)
![MUI](https://img.shields.io/badge/mui-v9-007FFF?logo=mui&logoColor=white)
![React Router](https://img.shields.io/badge/react--router-v7-CA4245?logo=reactrouter&logoColor=white)
![Vitest](https://img.shields.io/badge/vitest-4-6E9F18?logo=vitest&logoColor=white)

A single-page application that lets Shopify store owners track their accounting data — quarterly and all-time sales statistics, product revenues, purchases, cash movements, and royalties — all in one dashboard.

The frontend communicates with the REST API provided by the [shopify-accountancy-api](https://github.com/ripoul/shopify-accountancy-api) backend.

---

## Getting started

### Prerequisites

- **Node 24** — use [nvm](https://github.com/nvm-sh/nvm) and run `nvm use` at the project root to switch automatically.
- **pnpm 11** — install via `npm i -g pnpm` or the [official installer](https://pnpm.io/installation).
- A running instance of the [backend API](https://github.com/ripoul/shopify-accountancy-api).

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/shopify-accountancy.git
cd shopify-accountancy

# 2. Switch to the required Node version
nvm use

# 3. Install dependencies
pnpm install

# 4. Configure environment variables
cp .env.example .env
# Then open .env and set VITE_API_BASE_URL to your backend URL
```

### Run the development server

```bash
pnpm dev
```

The app is served at `http://localhost:5173` with Vite HMR enabled.

---

## Pre-commit hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before every commit.

### Register the hooks

Nothing to do — the hook is installed automatically by the `prepare` script when you run `pnpm install`.

### What the hooks do

On every `git commit`, the following run automatically against staged files only:

| Check | What it does |
|---|---|
| `eslint --fix` | Lints and auto-fixes TypeScript/TSX files (zero warnings allowed) |
| `prettier --write` | Formats source, config, markup, and doc files |

You can also run the same checks manually against whatever is currently staged:

```bash
pnpm exec lint-staged
```

---

## Tests

Tests are written with [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/), running in a `happy-dom` environment.

```bash
# Watch mode (re-runs on file changes)
pnpm test

# Single run
pnpm test --run

# Run a specific test file
pnpm test src/__tests__/components/Navbar.test.tsx

# Coverage report (enforces 80% threshold on lines, functions, branches, statements)
pnpm test:coverage
```

---

## Lint & format

```bash
# Lint all files (zero warnings allowed)
pnpm lint

# Format all files with Prettier
pnpm exec prettier --write .
```

Both are also applied automatically by the Husky pre-commit hook on staged files.
