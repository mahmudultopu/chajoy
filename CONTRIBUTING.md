# Contributing

## Workflow

1. Create a branch from `main`: `feature/<short-name>` or `fix/<short-name>`.
2. Make your change with tests where it affects pricing, ordering or permissions.
3. Run the checks below locally.
4. Open a pull request using the template. CI must pass before merging.

## Local checks

```bash
npm run typecheck
npm test
npm run build
```

For changes to the storefront or admin flows, also run the browser tests with
the app running and sample settings loaded:

```bash
npm run db:demo-ops
npm run dev                # in another terminal
npm run test:e2e
npm run test:e2e:admin
```

## Conventions

- **TypeScript everywhere.** Validate external input with Zod.
- **Money is integer paisa.** Format it only at the edges with `formatBDT`.
- **Prices are computed on the server** by `quote()` in `src/lib/pricing.ts`.
- **Document modules and exported functions** with a short comment explaining
  what they do and why.
- **Never invent business data.** Leave unknown details empty and flag them in
  `docs/REQUIRED-FROM-OWNER.md`.
- **Commit messages:** imperative mood, concise subject (≤ 72 characters),
  body explaining the why, e.g. `Add delivery radius check to checkout`.

## Database changes

Edit `src/lib/db/schema.ts`, then run `npm run db:generate` and commit the new
migration in `drizzle/`.
