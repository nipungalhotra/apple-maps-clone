# Payments

RoadReady sells **Learner PRO Monthly at $4.99/month, on the website, through Stripe Checkout** (a Stripe-hosted page, so card details never touch our servers). In local development a simulated checkout is used instead; it's turned off in production.

The plan list lives in `PLANS` in `server/lib/entitlements.js`, and the paywall reads it from `/api/payments/config`. To offer another plan, add it there with a Stripe price id.

> **Mobile apps:** the RevenueCat in-app-purchase code is still included but switched off until RevenueCat keys are set. If you publish the iOS/Android apps later, follow the RevenueCat section below. Apple and Google require in-app purchase for digital upgrades inside their apps. Earlier one-time "lifetime" purchases keep working.

Purchases belong to the **account**, so buying is only possible when signed in (see [Accounts and database](ACCOUNTS_AND_DATABASE.md)). Pro is active if **any** source grants it. A web purchase also unlocks Pro in the mobile apps, and the other way round.

## How a purchase is confirmed

The server never trusts the app's word that someone paid.

- **Web:** the app asks the API for a Checkout link (`POST /api/payments/stripe/checkout`) and opens it. Stripe then calls our webhook. The API verifies the signature and grants access.
  - When the person comes back (`?checkout=success`), the app also calls `POST /api/payments/stripe/confirm`, so access appears straight away even if the webhook is a few seconds late.
  - Renewals, cancellations, failed payments and full refunds arrive through the same webhook.
- **Mobile:** the RevenueCat SDK runs the store purchase sheet. The app then calls `POST /api/payments/revenuecat/sync`, and the API asks RevenueCat's REST API what the person owns.
  - RevenueCat webhooks trigger the same check for renewals, cancellations, refunds and transfers.

Each webhook event is processed only once (`roadready.payment_events`). Access is stored per provider in `roadready.entitlements`.

## Setup: Stripe (web)

1. In Stripe (use **test mode** first), create a product "Learner PRO Monthly" with a **recurring monthly** price of **$4.99**. Copy its `price_…` id.
2. Add a webhook endpoint `https://<your-api>/api/payments/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `charge.refunded`

   Copy its signing secret (`whsec_…`).
3. Turn on the **Customer portal** (Settings → Billing → Customer portal) and allow cancelling subscriptions. "Manage or cancel plan" opens it.
4. Set these on the API (Render):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_MONTHLY`
   - `APP_URL` (your web app, e.g. `https://roadready.app`)
5. Test with card `4242 4242 4242 4242`. For local webhooks use the Stripe CLI: `stripe listen --forward-to localhost:3001/api/payments/stripe/webhook`.

## Setup: App Store and Google Play (RevenueCat), only if you publish the mobile apps

1. **App Store Connect:** sign the Paid Applications agreement and add banking and tax details. Then create the products:
   - a **Non-Consumable** for lifetime, e.g. `roadready_lifetime`
   - an **Auto-Renewable Subscription** for monthly, e.g. `roadready_monthly`
2. **Google Play Console:** create a **one-time product** and a **subscription** with the same ids.
3. **RevenueCat:** create a project and add both apps. Then:
   - create an entitlement **`pro`** and attach both products
   - create an **Offering** marked *Current*, with a **Lifetime** package and a **Monthly** package. The app picks packages by these types.
4. **RevenueCat → Integrations → Webhooks:** URL `https://<your-api>/api/payments/revenuecat/webhook`. Set an Authorization header value, for example `Bearer <long random string>`.
5. Set these on the API (Render):
   - `REVENUECAT_SECRET_KEY` (a secret API key)
   - `REVENUECAT_WEBHOOK_AUTH` (exactly the header value from step 4)
   - `REVENUECAT_ENTITLEMENT_ID` if it isn't `pro`
6. Set these on the mobile builds:
   - `VITE_REVENUECAT_IOS_KEY` and `VITE_REVENUECAT_ANDROID_KEY` (public SDK keys)
   - `VITE_TERMS_URL` and `VITE_PRIVACY_URL`

   Then run `npm run build && npx cap sync`.
7. Test with a sandbox Apple ID or a Play license tester. Keep store prices in line with the web price in `server/lib/entitlements.js`.

## Store rules this covers

- The mobile apps only use in-app purchases. Stripe is never offered inside the iOS or Android build.
- **Restore purchases** is on the paywall.
- The paywall shows each plan's price, length and auto-renewal terms. On phones it shows the store's localised price.
- Terms and Privacy links appear when `VITE_TERMS_URL` and `VITE_PRIVACY_URL` are set. **Apple requires them for subscriptions**, so publish both pages first.
- Account deletion cancels a renewing **web** subscription. App Store and Google Play subscriptions can only be cancelled by the person in their store account, and the delete screen tells them so.

## Not included yet

- Free trials and introductory offers. Configure them in Stripe / the stores; the code needs no change.
- Family Sharing, regional pricing on the web, and tax handling. Turn on **Stripe Tax**; Apple and Google handle tax for in-app purchases.
- Parent-pays-for-teen (one payer, two accounts).
