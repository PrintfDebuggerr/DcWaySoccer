# DC Way — Remaining Roadmap (status as of 2026-06-22)

Companion to `SCOPE-ROADMAP.md` (the original 33-task classification). This tracks what's DONE vs
what's LEFT, and flags the **app/scope dependencies** that can't be solved in the theme alone.

Legend: ✅ done & verified · 🟡 partial · ⬜ not started · 🧩 needs a Shopify app / extension ·
👤 client action (install/configure an app, expand catalog) · 💳 needs paid app.

---

## ✅ DONE (live on theme #152220762284, Playwright-verified)

**Faz 1 — theme**
- Home, Programs, Camps, About, Testimonials, FAQ pages
- Gallery: filterable program/camp grid + video lightbox (`dcway-gallery-albums`, `gallery_image` +category/video_url)
- Footer + Contact maps (single Google embed, content-height)
- Predictive search in header (polished: backdrop, price/type, keyboard nav, see-all)
- Countdown timer (`dcway-countdown`, on Registration)
- Newsletter (footer), Branded 404, Rounded-corner system (Dawn corners→12px + `--dcway-radius`)
- Cookie consent + privacy policy (client did admin config) + footer policy links

**Faz 2 — registration builder (task #3)**
- `dcway-registration-builder`: Child→Type→Week→Location→Option→Care→Add-ons, live total,
  required-field gating, week→location auto-greying, single `/cart/add.js` with grouped line items
- Data model cleaned (4 Option variants + `reg-care`; add-ons reuse merch)

**Faz 3 — membership pricing (task #14, theme parts)**
- Builder shows member pricing (tag-gated strike prices on base+care, savings line)
- `dcway-membership-join`: $100/yr buy CTA + active-member status card

**Faz 4 — account data model (task #2, foundation)**
- `docs/ACCOUNT-DATA-MODEL.md` (children json schema + age/grade derivation)
- Builder "Choose Your Child" reads `dcway.children` → dropdown w/ auto age; guest fallback

---

## ⬜ REMAINING — by area

### A. Catalog / data population 👤
- ⬜ Build the FULL registration catalog: every camp × week × location product (tags `reg-camp-*`,
  `reg-week-*`, 4 Option variants each). Builder lights up combos automatically — no code. Big data task.
- ⬜ Program/clinic/league products beyond the summer-camp sample.

### B. Membership enforcement (task #14) 🧩💳👤
- ⬜ Install a membership/discount **app** (Appstle Memberships / Seal / Regios). Native automatic
  discounts CANNOT target members — verified. App must: tag active members `member`, set 12-mo expiry,
  apply auto 10% to the registration/programs collection (no coupon), write `dcway.membership_expires`
  /`_savings`. Theme already reads these.
- ⬜ Renewal reminder emails 30 + 7 days before expiry (overlaps Email Automation §F).
- ⬜ Admin member list + manual add/remove (the app provides this).

### C. Account system (task #2) 🧩👤
Store uses NEW customer accounts → account UI needs a **Customer Account UI Extension app** OR a
customer-fields app (Helium Customer Fields). Pick one, then build:
- ⬜ Children tab: add/edit children, DOB→age, School-Start-Year→Grade, Emergency Contact (data model ready)
- ⬜ Membership tab: status / purchase date / expiry / total saved / renew button (30 days before expiry)
- ⬜ Order History rename (#→Order Number, etc.) — only possible via custom order table in a UI extension
- ⬜ Parent + Password tabs stay as-is

### D. Cart / Checkout / Payment (tasks #4–7) 🧩
- 🟡 Multi-item single cart works (native + builder). ⬜ Cart line-item editing (change option from cart).
- ⬜ Pre-checkout form page (parent/child/program-specific/waivers) → line item properties (NO Plus).
  Admin-manageable program sections + waivers (task #6).
- ⬜ Shopify Payments setup (replaces Stripe Elements; Apple/Google Pay native). 👤 client enables.
- ⬜ Guest + account-create-at-checkout flows (mostly native; child selector at checkout limited w/o Plus).

### E. Post-purchase & operations (tasks #8–13) 🧩💳👤
- ⬜ Post-purchase recommendations (#8) — app or order-status UI extension
- ⬜ Orders Excel export + filters + refunds column (#9) — Matrixify app 💳
- ⬜ Refunds full/partial (#10) — native admin (works today); export reflection via app
- ⬜ Waitlist (#11) + Capacity management (#12) — app (Back-in-Stock) / inventory + automation
- ⬜ Receipts / order editing / updated receipts (#13) — native + receipt app

### F. Email & admin automation (tasks #15–21) 💳👤
- ⬜ Email automation: confirmation/receipt/reminder/follow-up (#15) — Klaviyo / Shopify Email + Flow
- ⬜ Segmented parent communication (#16) — Klaviyo segments
- ⬜ Pending-payment reminders (#17), Abandoned cart (#18, native/Klaviyo)
- ⬜ Analytics dashboard (#19) + scheduled report emails (#20) — Shopify Analytics + Polar/custom + Flow
- ⬜ Discount codes admin (#21) — native; stacking-with-membership needs the discount app's rules

### G. Site-wide features (tasks #22–33)
- ⬜ Custom table builder (#22) — theme: metaobject-driven table section (buildable)
- ✅ Search (#23) · ✅ Countdown (#24) · ✅ Newsletter (#25, footer) · ✅ 404 (#28) · ✅ Cookie (#27)
- 🟡 SEO basics (#26): meta/alt/sitemap native; **clean URLs `/summer-camp` impossible on Shopify** (dropped)
- ⬜ Page speed pass (#29) — image/section audit; mostly Shopify CDN auto
- ⬜ GA4 (#30) 👤 · Facebook Pixel (#31) 👤 — Google/Meta channels + theme
- ⬜ Live chat / WhatsApp widget (#32) — theme snippet or Tidio app
- ⬜ Referral program (#33) — app (ReferralCandy) 💳

---

## Suggested next order
1. **Catalog population (§A)** — unblocks the builder for all camps (no code; client/data).
2. **Membership app (§B)** + **account/fields app (§C)** — the two app installs; then I wire/QA the theme side.
3. **Pre-checkout form + waivers (§D #6)** — the big remaining theme/UX build.
4. **3rd-party ops apps (§E/§F)** — Klaviyo, Matrixify, waitlist, analytics.
5. **Polish (§G)** — custom tables, GA4/Pixel, chat widget, speed.

## Client action items (communicate as scope/cost)
- 💳 Membership app (Faz 3 enforcement) · 💳 Account/fields app (Faz 4 UI) · 💳 Klaviyo (email) ·
  💳 Matrixify (export) · 💳 Waitlist app · 💳 Referral app · 👤 enable Shopify Payments, GA4, FB Pixel ·
  👤 populate the full camp/program catalog.
