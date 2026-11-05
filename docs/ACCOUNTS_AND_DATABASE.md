# Accounts and database

RoadReady stores data in **Postgres** and uses **Supabase Auth** for accounts.

- **Guests** can use the app without signing up. Their data is tied to a random device ID.
- **Accounts** keep practice hours and the Pro plan on every device. When someone signs in, any hours they logged as a guest on that device move into their account.
- **Buying Pro needs an account**, so the purchase can be restored later.
- **Account deletion** is built in (Account → Delete account), as Apple requires. It deletes the person's logged hours, plan, reports and booking requests, then their login.

## How it fits together

| Piece | Where | Notes |
|---|---|---|
| Sign up / sign in / password reset | App → Supabase Auth (`src/services/authService.js`) | The app never sends passwords to our API |
| API identity | `server/lib/auth.js` | Verifies the Supabase access token (`Authorization: Bearer …`). Falls back to the device ID (`X-Client-Id`) for guests |
| Database | `server/db/` | `pg` when `DATABASE_URL` is set. Without it, an embedded Postgres (PGlite) is used for local dev and tests |
| Schema | `server/db/migrations.js` | Runs automatically at startup. Tables live in the `roadready` schema, which Supabase's public Data API does not expose |
| Account endpoints | `server/routes/account.js` | `GET /api/account`, `POST /api/account/claim`, `DELETE /api/account` |

## Local development

Nothing to set up. Run `npm run server` and `npm run dev`. Data is saved in `server/storage/pglite`, which is not committed to git.

To try accounts locally, put your Supabase project's values in `.env` (see below). Without them the app runs in guest-only mode and hides the Sign in button.

## Setting up Supabase (once)

1. Create a project at supabase.com. Choose a region close to your API server.
2. **Authentication → Sign In / Providers → Email**:
   - turn on **Confirm email**
   - set the minimum password length to **8**
3. **Authentication → URL Configuration**:
   - **Site URL:** your web app, e.g. `https://roadready.app`
   - **Redirect URLs:** add the same URL, plus `http://localhost:3000` for development
4. **Authentication → Emails → SMTP:** connect a real email sender (Resend, Postmark, SES). Supabase's built-in sender only allows a few emails per hour and is not meant for production.
5. Copy the keys:
   - **Project Settings → API:** Project URL, the publishable (or anon) key, and the secret / service-role key
   - **Project Settings → Database → Connection string:** the **Session pooler** URI. It works on IPv4 hosts such as Render.

## Environment variables

| Variable | Where | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | Web build (Vercel) and native builds | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Web build (Vercel) and native builds | No (it is meant to be public) |
| `VITE_AUTH_REDIRECT_URL` | Web/native builds, optional | No |
| `DATABASE_URL` | API (Render) | **Yes** |
| `SUPABASE_URL` | API (Render) | No |
| `SUPABASE_SERVICE_ROLE_KEY` | API (Render) | **Yes. Never put it in a `VITE_` variable** |
| `SUPABASE_JWT_SECRET` | API, only for projects still on the legacy JWT secret | **Yes** |

In production the API refuses to start without `DATABASE_URL`. `GET /api/health` reports `database` and `accounts` status.

## Native apps (iOS / Android)

The confirmation and reset emails open the **web** app (the Site URL). After confirming, the person signs in inside the native app with their email and password. Opening those links directly in the native app needs deep links, which are not set up yet.

## Not done yet

- Sign in with Apple / Google. If you add Google sign-in on iOS, Apple requires Sign in with Apple as well.
- Parent accounts linked to a learner.
- Automated database backups beyond what your Postgres host provides. Supabase Pro includes daily backups.
