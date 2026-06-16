# Contributing

## Branches

Two long-lived branches:

- **`main`** — production. Deploys to `linkednt.com` + the prod Supabase
  project + live Polar. Protected: only mergeable via PR from `dev`.
- **`dev`** — sandbox. Deploys to `dev.linkednt.com` + the sandbox
  Supabase project + sandbox Polar. Open work branches off `dev`,
  PRs target `dev`.

```
feature-branch ──PR──▶ dev ──PR──▶ main
                       │            │
                       ▼            ▼
                dev.linkednt.com   linkednt.com
                sandbox Supabase   prod Supabase
                sandbox Polar      live Polar
```

## Workflow

1. **New work:** branch off `dev`, push, open PR targeting `dev`.
   - CI runs lint/typecheck/build using **sandbox** env vars.
   - A Cloudflare Pages preview is deployed and the URL is posted on
     the PR. The preview is built with sandbox config (sandbox Supabase
     URL, sandbox Polar), so you can exercise the full purchase flow
     using a test card without moving real money.
2. **Merge to `dev`:** the merge push triggers `landing.yml` and/or
   `backend.yml` to deploy to the sandbox environment. Browse
   `dev.linkednt.com` to verify.
3. **Promote to `main`:** open a PR `dev → main`. CI rebuilds + previews
   against **production** env vars. Merging this PR ships to prod.

## Environment selection

Both workflows pick the GitHub environment via:

```yaml
environment: ${{ github.ref == 'refs/heads/main' && 'production' || 'sandbox' }}
```

That's the only place the branch ↔ env binding lives. Adding a new
long-lived branch is one ternary edit + a new GitHub environment.

## Local development

- `bun run landing:dev` runs the landing site locally on `localhost:3000`
  with whatever's in `.env.local`.
- `bun --filter '@linkednt/extension' build` builds the extension into
  `packages/extension/build/`. Load it as an unpacked extension in
  Chrome → `chrome://extensions` → Developer mode → Load unpacked.
- The backend (Supabase edge functions) is deployed by CI; for local
  iteration use `supabase functions serve <name>` with `.env.local`
  values in `packages/backend/.env.local`.

## Conventional commits

We use conventional-commit prefixes (`feat:`, `fix:`, `chore:`,
`refactor:`, `docs:`). Scope optional but appreciated:
`feat(extension): …`, `fix(backend): …`.

## Bypassing CI

Don't. If a hook fails, fix the underlying cause rather than reaching
for `--no-verify` — the hooks exist to catch the things that will
otherwise blow up in production.
