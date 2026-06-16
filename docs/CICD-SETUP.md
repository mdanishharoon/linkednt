# CI/CD setup checklist

One-time infrastructure work to enable the dev/main split. After this
runs, the workflows in `.github/workflows/` will take over.

## 1. Create the sandbox Supabase project

1. https://supabase.com/dashboard → org **linkednt** → New Project
2. Name: `linkednt-sandbox`
3. Generate a strong DB password and save it (you won't need it again
   unless you reset the project)
4. Region: same as prod (`us-east-1` if that's prod) so latency math
   transfers
5. Once created, grab from the Project Settings:
   - **Project Reference** (looks like `abcdefg123`)
   - **Project URL** (`https://<ref>.supabase.co`)
   - **Anon key** (Settings → API → `anon public`)

## 2. Sandbox Supabase: secrets

In the sandbox project: Settings → Edge Functions → Secrets, add:

```
POLAR_ENV=sandbox
POLAR_SANDBOX_TOKEN=<sandbox PAT — rotate the one you pasted in chat first>
POLAR_SANDBOX_WEBHOOK_SECRET=<rotate the one you pasted in chat first>
GROQ_API_KEY=<your Groq key — same one is fine; rate limits are per-key>
OPENROUTER_API_KEY=<your OpenRouter key>
GOOGLE_CLIENT_ID=<see step 3>
GOOGLE_CLIENT_SECRET=<see step 3>
DAILY_PAID_CAP=500
DAILY_CREDIT_CEILING=10000
```

Production secrets stay on the prod project unchanged.

## 3. Google OAuth for the sandbox domain

In Google Cloud Console → APIs & Services → Credentials, on your
existing OAuth 2.0 Client ID, add to **Authorized redirect URIs**:

```
https://<sandbox-project-ref>.supabase.co/auth/v1/callback
https://dev.linkednt.com/auth/callback
```

The same client ID works for both envs as long as both redirect URIs
are whitelisted. Use the existing `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` for the sandbox project's secrets.

## 4. Sandbox Supabase: auth config

Authentication → URL Configuration:

- Site URL: `https://dev.linkednt.com`
- Additional Redirect URLs:
  - `https://dev.linkednt.com/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev against
    the sandbox project)

Authentication → Providers → Google → enable, paste in
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 5. DNS + Cloudflare Pages binding

DNS (Cloudflare DNS): add a CNAME record

```
dev   →  linkednt.pages.dev   (proxy: ON)
```

Cloudflare Pages → linkednt project → Custom domains → Add custom
domain → `dev.linkednt.com`. CF will detect the CNAME and ask to bind
it to a branch — choose **`dev`**.

After this, pushes to `dev` deploy to `dev.linkednt.com`, pushes to
`main` keep deploying to `linkednt.com`.

## 6. GitHub environments

Repo → Settings → Environments. Create two if they don't both exist:

### `production`

**Variables**
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prod Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod anon key |
| `NEXT_PUBLIC_POLAR_ENV` | `production` |
| `NEXT_PUBLIC_SITE_URL` | `https://linkednt.com` |
| `SUPABASE_PROJECT_REF` | `deagkfqvklpzewvlgorp` |

**Secrets**
| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | PAT from supabase.com → Account → Access Tokens |

### `sandbox`

**Variables**
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sandbox project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sandbox anon key |
| `NEXT_PUBLIC_POLAR_ENV` | `sandbox` |
| `NEXT_PUBLIC_SITE_URL` | `https://dev.linkednt.com` |
| `SUPABASE_PROJECT_REF` | sandbox project ref |

**Secrets**
| Name | Value |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | same PAT — env-scoped for blast-radius hygiene |

Repository-level secrets (already exist, shared across envs):
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, optionally
`GH_ADMIN_TOKEN`.

## 7. Polar sandbox webhook

In sandbox.polar.sh → Webhooks → Add endpoint:

- URL: `https://<sandbox-project-ref>.supabase.co/functions/v1/polar-webhook`
- Events: at minimum `order.paid`. Also `order.created` and
  `checkout.*` if you want richer telemetry.
- Save the signing secret it generates; it's already added to the
  sandbox project's secrets per step 2.

## 8. Branch protection (after the first PR merges)

I'll attempt to apply this automatically via `gh api` when this PR is
opened. If it fails (e.g. missing repo-admin scope on the gh token):

Repo → Settings → Branches → Add rule for `main`:

- ✔ Require a pull request before merging
- ✔ Require status checks to pass: `Lint & Build`, `Typecheck shared backend code` (when present)
- ✔ Restrict who can push to matching branches → leave empty (only PRs)
- ✔ Do not allow bypassing the above settings

Same rule on `dev` is optional but recommended:

- ✔ Require a pull request before merging
- Status checks optional on dev (faster iteration)

## 9. Verify

Open a tiny PR to `dev` (e.g. typo fix). Walk through:

1. PR shows `Preview deployed to: <url>` comment with `sandbox` env
2. Merge to `dev` → `dev.linkednt.com` updates
3. Open `dev → main` PR → preview rebuilds with `production` env
4. Merge → `linkednt.com` updates

If any step fails, `Actions` tab logs will name the missing var or
broken auth.
