# Analytics: is RoadReady making money?

RoadReady has **first-party analytics**: a few events are stored in our own database, and an owner-only dashboard turns them into profit numbers. No third-party tracker is involved, which matters because many users are teenagers.

## Open the dashboard

1. Set `ADMIN_TOKEN` on the API server (a long random string).
2. Visit **`https://<your-web-app>/admin`** and enter that token. It's kept in that browser tab only; **Lock** forgets it.

Controls along the top:
- **Period:** 7, 30 or 90 days.
- **Monthly costs:** enter your real running costs (default `MONTHLY_COSTS_USD`, $75).
- **Include test purchases:** counts simulated checkouts. Leave it off for real numbers.

## What it shows

| Number | Meaning | How it's worked out |
|---|---|---|
| **Profit per month** | The headline answer | paying subscribers × kept per payment − monthly costs |
| Kept per payment | $4.99 minus card fees | $4.99 − 3.6% − $0.30 ≈ **$4.51** (`PAYMENT_FEE_PERCENT`, `PAYMENT_FEE_FIXED`) |
| Break-even | Subscribers needed to cover costs | costs ÷ kept per payment (≈ 17 at $75) |
| Visitors who pay | Overall conversion | new paying ÷ visitors in the period |
| Monthly cancellations | Churn | subscriptions that ended ÷ subscribers at the start, scaled to 30 days |
| Subscribers stay | Average lifetime | 1 ÷ monthly churn |
| Value of a customer | Lifetime value | kept per payment × months they stay |
| Max to spend winning one | Ceiling for ads/referral rewards | a third of customer value |
| Funnel | Where people drop off | visitors → saw paywall → created account → started checkout → paying |
| Where people come from | Channels that bring **paying** customers | the source of each visitor's **first** visit |

The last day on the trend charts is today, so it's drawn dashed (it isn't over yet).

The same data is available as JSON: `GET /api/admin/metrics?days=30&includeSimulated=0&costs=75` with `Authorization: Bearer <ADMIN_TOKEN>`.

## Tag your links so you know what works

Add `?utm_source=` to every link you share:
- `https://roadready.app/?utm_source=tiktok`
- `?utm_source=youtube`
- `?utm_source=school-<name>`
- `?utm_source=google-ads&utm_campaign=spring`

Untagged visits use the referring site (e.g. `google.com`). Visits with no referrer count as `direct`.

## What is collected, and what isn't

| Event | Sent when | Extra data |
|---|---|---|
| `app_open` | First load in a browser session | where the visit came from (UTM tags or referring site) |
| `paywall_view` | The paywall opens for a free user | which feature prompted it |
| `signup_view` | The create-account screen opens | from the paywall or the menu |
| `checkout_start` | Someone presses Subscribe | plan |

Sign-ups, purchases and cancellations come from the accounts and payments tables, not from the browser, so they're exact.

**Not stored:**
- IP addresses, browser user-agent strings, emails or names
- the raw device ID; only a one-way hash, so an analytics row can't be used to read a guest's data
- anything at all from browsers with **Do Not Track** or **Global Privacy Control** switched on

Events are deleted after **13 months**. Deleting an account deletes that person's events.

Mention this analytics in your privacy policy, e.g. "We record anonymous usage events (pages opened, plan screens viewed) to improve the app. We don't use third-party trackers."

## Limits

- People with Do Not Track or Global Privacy Control on aren't counted, so visitors are slightly undercounted and conversion slightly overstated.
- Churn needs a month or two of paying subscribers before it means much. Until then the dashboard says "Not enough history yet".
- Source attribution links a payer to the device they first visited on. If they paid on a different device it shows as `direct`.
