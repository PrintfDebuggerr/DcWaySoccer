# DC Way — Apps & Client Setup Needed

Things that **cannot be built in the Shopify theme** and require the client to install/configure an app
or enable a setting. The theme is built to integrate with each (reads the tags/metafields they produce).
Grouped by priority. 💳 = paid app (monthly).

---

## Required for core features

| # | Need | App / setting | Why it can't be theme-only | Theme side (done) |
|---|---|---|---|---|
| 1 | **Member 10% auto-discount** (task #14) | 💳 **Appstle Memberships** (or Seal / Regios Automatic Discounts) | Native automatic discounts can't be limited to members; custom Function was declined | Builder + membership page already show member pricing; read `member` tag + `dcway.membership_*` metafields |
| 2 | **Account: Children + Membership tabs, DOB→age, Emergency Contact, edit profile** (task #2) | 💳 **Helium Customer Fields** OR a Customer Account UI Extension app | Store uses NEW customer accounts → theme can't customize the account UI | Child data model `dcway.children` defined; builder child-picker reads it |
| 3 | **Payments** (task #7) | **Shopify Payments** (enable in admin) | Embedded Stripe Elements impossible on hosted checkout; Shopify Payments = Stripe under the hood + Apple/Google Pay | Stripe-embed dropped by decision |

## Operations & growth

| # | Need | App / setting |
|---|---|---|
| 4 | Orders Excel export + filters + refunds column (task #9) | 💳 Matrixify |
| 5 | Waitlist + capacity (tasks #11–12) | 💳 Back-in-Stock / Restock Rocket |
| 6 | Email automation: confirmations, receipts, reminders, abandoned cart, membership renewal, follow-up (tasks #15–18, #14 renewal) | 💳 Klaviyo (+ Shopify Flow) |
| 7 | Analytics dashboard + scheduled report emails (tasks #19–20) | 💳 Polar Analytics (or Shopify Analytics + Flow) |
| 8 | Parent communication by segment (task #16) | Klaviyo segments (same as #6) |
| 9 | Post-purchase recommendations (task #8) | Shopify Search & Discovery (free) or an upsell app |
| 10 | Referral program (task #33) | 💳 ReferralCandy |
| 11 | Live chat / WhatsApp (task #32) | Tidio / native theme snippet (can be theme) |

## Client admin actions (no app, just settings)

- Enable **Shopify Payments** (#3).
- Connect **Google Analytics 4** (task #30) and **Facebook/Meta Pixel** (task #31) via the Google &
  Meta sales channels — then give the developer the IDs if theme-level events are wanted.
- **Cookie banner + Privacy policy** — already enabled in admin (Faz 1).
- **Refunds** (task #10) — native Shopify admin, works today.
- **Populate the registration catalog** — see `REGISTRATION-PRODUCTS.md` (merchant task, no code).

---

## What the developer (theme/code) still owns — no app needed

- Pre-checkout form + waivers page (task #6) — line-item-property approach, no Plus.
- Custom table builder for league schedules (task #22) — metaobject-driven theme section.
- Product-card member pricing, page-speed pass, live-chat snippet, custom-table section.
- Wiring the theme to apps #1/#2 once installed (member tabs display, child picker is ready).

See `REMAINING-ROADMAP.md` for the full status of all 33 tasks.
