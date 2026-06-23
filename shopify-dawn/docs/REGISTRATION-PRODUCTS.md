# Filling the Registration Catalog (merchant guide)

> **Updated for the Registration Builder (Faz 2).** The old drilldown-filter model (11-variant
> "Session" option + 6 metafields) is replaced. The `/pages/registration` page now uses the
> **Registration Builder** — parents pick Type → Week → Location → Option → Care → Add-ons and see a
> live price. **The DC Way team fills the product catalog; no developer/code needed.**

## How the builder decides what's available

The builder reads every product in the **Registration (all)** smart collection (rule: `tag = reg`) and
builds the catalog automatically:

- A product's **location** comes from its `reg-camp-<slug>` tag.
- A product's **week** comes from its `reg-week-<N>` tag.
- The **Options** parents can pick are the product's **variants** (the price-bearing choices).
- A week button lights up if ANY product has that `reg-week-N` tag. A location lights up for the
  selected week only if a product exists with that `reg-camp-<slug>` + `reg-week-N`. Everything else is
  automatically greyed out. **Add a product → its Week+Location combo turns on. No code change.**

The 4 location slugs and weeks 1–10 are fixed in the page. Use exactly these location slugs:

| Location | tag slug |
|---|---|
| Hill Center | `reg-camp-hill-center` |
| Stuart-Hobson Middle School | `reg-camp-stuart-hobson` |
| Chisholm Elementary School | `reg-camp-chisholm` |
| Gallaudet University | `reg-camp-gallaudet` |

*(Adding a brand-new location or an 11th week DOES need a small theme tweak — tell the developer.)*

---

## Add one camp week (the whole workflow)

**Fastest: duplicate the sample product** `2026 Stuart-Hobson … Week 1`.

1. Shopify admin → **Products** → open `reg-stuart-hobson-week-1-full-week`.
2. **More actions → Duplicate**. Set status **Active**.
3. **Title** → e.g. `2026 Hill Center Art & Soccer Summer Camp — Week 2`.
4. **Tags** → keep `reg`; set the location + week tags for THIS product:
   - `reg` (required — puts it in the Registration collection)
   - `reg-camp-hill-center` (the location, from the table above)
   - `reg-week-2` (the week number)
   - *(optional)* `reg-cat-summer`
5. **Variants → Option** — keep the **4 options** and set each price for this camp:
   - `Full Week (9 am-3 pm)`
   - `Extended Full Week (9 am-5:30 pm)`
   - `First Session (9 am-12 pm)`
   - `Second Session (12 pm-3 pm)`
   > The builder shows **Full Week / Extended** under "Full Week" type and **First/Second Session**
   > under "Single Day" type. Keep these 4 option names (the words "Full Week" and "Session" drive the
   > Type filter). Don't bake add-ons into options — add-ons are separate (below).
6. **Save.** Done — the builder now offers Week 2 + Hill Center with these prices.

Repeat for every camp × week × location you offer.

---

## Add-ons & Care — set up ONCE, shared by all camps

These are **separate products** added as their own cart line items; you do NOT recreate them per camp:

- **Before/After Care** — product `reg-care` (variants: Before Care $10, After Care $15). Edit prices here.
- **T-shirt** — `dc-way-youth-panna-tshirt` (sizes) · **Soccer Ball** — `dc-way-custom-ball` (sizes) ·
  **Shin Guards** — `dc-way-shin-guards` (sizes).

To add a new add-on type: create the merch product (with size variants) and add it to the builder's
**Add-on products** setting (Theme editor → Registration page → Registration builder).

---

## Tips & gotchas

- **Keep variant Option names exactly** as the 4 above so the Full Week / Single Day filter works.
- **Price is per variant**, in dollars. The member 10% shows automatically for logged-in members
  (the discount itself is applied by the membership app at checkout).
- **Photos / dates / ages**: optional product fields; the builder doesn't require metafields anymore.
- After saving, check `/pages/registration`: your Week+Location should light up and prices should match.
- **Programs** (Capitol Hill League, clinics, leagues) are NOT summer-camp-shaped; the current builder is
  camp-centric. Programs are handled as their own products/pages — discuss structure with the developer.
