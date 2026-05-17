# Registration Page — Adding Camps, Weeks, and Programs

This guide explains how to add new registration items (camp weeks, one-day camps, or programs) so they appear on the `/pages/registration` page. No code changes required — everything is driven by **product tags + metafields** in Shopify admin.

## How the page works

The registration page filters products by tag:

1. The user picks a tab: **Camps** or **Programs**.
2. They pick a subcategory in the dropdown (e.g. *Summer Camp*, *One Day Camp*, *Goalkeeping School*).
3. They pick a camp tile (e.g. *Stuart-Hobson*).
4. They pick a week tile (e.g. *Week 1: June 16, 18, 19*).
5. Up to **3 cards** appear: *Full Week / One Day / Before & After Care*.

Each card is a separate product. The filter logic shows only the products whose tags match the selections.

## Quick start: adding a new camp week (recommended workflow)

The fastest way is to **duplicate the existing sample product** and edit it.

1. In Shopify admin, go to **Products**.
2. Find the product **2026 Stuart-Hobson Soccer, Art & Explore Summer Camp - Week 1 (Full Week)**.
3. Click **More actions → Duplicate**.
4. Edit the duplicate:

| Field | What to change | Example |
|---|---|---|
| **Title** | Update camp name, week number, type | `2026 Hill Center Art & Soccer Summer Camp - Week 2 (Full Week)` |
| **Handle** | Update slug (auto-generated when title changes) | `reg-hill-center-week-2-full-week` |
| **Tags** | Replace `reg-camp-stuart-hobson` and `reg-week-1` with the new values | `reg`, `reg-cat-summer`, `reg-camp-hill-center`, `reg-week-2`, `reg-type-full-week` |
| **Variants** | Update each variant price | `Full Week (9-3 pm)` → `$285` |
| **Metafields** (see below) | Update *Location*, *Dates*, *Ages* | `Hill Center Middle School`, `June 22-26`, `Ages 5-12` |

5. Click **Save**.

Done. The product is now live on the registration page. The Online Store collection **Registration (all)** auto-includes it (smart collection with rule `tag = reg`).

## Required tags

Every registration product must have **all five** tags:

| Tag | Purpose | Examples |
|---|---|---|
| `reg` | Marks the product as a registration item (used by the smart collection) | `reg` |
| `reg-cat-{slug}` | Subcategory | `reg-cat-summer`, `reg-cat-one-day-camp`, `reg-cat-goalkeeping`, `reg-cat-capitol-hill-league` |
| `reg-camp-{slug}` | Which camp (camps only) | `reg-camp-stuart-hobson`, `reg-camp-hill-center`, `reg-camp-chisholm`, `reg-camp-brazilian-way`, `reg-camp-preschool` |
| `reg-week-{N}` | Which week (camps only) | `reg-week-1` ... `reg-week-10` |
| `reg-type-{slug}` | Which card slot (left/middle/right) | `reg-type-full-week`, `reg-type-one-day`, `reg-type-before-after-care` |

Use lowercase and hyphens. **The slug values must match** what's configured in the registration page theme settings (camp tile slugs, week numbers, dropdown subcategories).

## Required metafields

These show up under the product's title on the card. Set them under **Product → Metafields → Show all → dcway_registration**:

| Key | Type | Example |
|---|---|---|
| `location_label` | Single-line text | `Stuart-Hobson Middle School (Soccer, Art & Explore Camp)` |
| `dates_label` | Single-line text | `June 16, 18, 19` |
| `ages_label` | Single-line text | `Ages 3-12` |
| `card_order` | Integer | `1` for Full Week, `2` for One Day, `3` for Before & After Care |
| `card_type_label` | Single-line text | `Full Week` / `One Day` / `Before & After Care` |
| `camp_label` | Single-line text | `Stuart-Hobson Soccer, Art & Explore Summer Camp` (heading shown when this camp is selected) |

## Variants

Each card has a dropdown of session options. These are **product variants** under a single option called `Session`. Example for a Full Week card:

- Full Week (9-3 pm) — `$305`
- Full Week + T-shirt — `$320`
- Full Week + Soccer Ball — `$335`
- Extended Full Week (9-5:30 pm) — `$355`
- Extended Full Week + T-shirt — `$370`
- First Session (9-12 pm) — `$185`
- First Session + T-shirt — `$200`
- Second Session (12-3 pm) — `$185`
- Second Session + T-shirt — `$200`
- Before Care (8-9 am) — `$45`
- After Care (3-5:30 pm) — `$75`

Keep variant count below **50 per product** (Shopify limit). If you need more, split into a separate product (e.g. add a *Premium* type).

## Adding a brand new camp (not just a new week)

If the camp doesn't exist yet:

1. Create the products as above with the new `reg-camp-{slug}` tag.
2. Go to **Online Store → Themes → Customize → Pages → registration**.
3. In the **Registration filter** section, click **Add block → Camp / program tile**.
4. Fill in:
   - **Tile button label**: shown in the camp grid
   - **Section heading**: shown above the cards when this tile is active
   - **Slug**: must match `reg-camp-{slug}` (without the `reg-camp-` prefix)
   - **Category**: `Camps`
   - **Subcategory**: `summer` or `one-day-camp`
5. Save.

## Adding a new week

1. Go to **Online Store → Themes → Customize → Pages → registration**.
2. **Registration filter** section → **Add block → Week tile**.
3. Fill in:
   - **Tile label**: e.g. `WEEK 11: AUGUST 24-28`
   - **Week number**: e.g. `11`
4. Save.
5. Tag the matching products with `reg-week-11`.

## Adding a new program (not a camp)

Programs work like camps but don't use week tiles:

1. Create the product with these tags: `reg`, `reg-cat-{program-slug}`, `reg-camp-{program-slug}`, `reg-type-{type}` (no `reg-week-*` tag).
2. Add a dropdown option block to **Registration header** with the program label + subcategory slug.
3. Add a camp/program tile block to **Registration filter** with `category: programs` + matching subcategory.

## Troubleshooting

- **My new product doesn't show up.** Verify all 5 tags are present and spelled correctly (case-sensitive, lowercase, hyphens). Confirm the product is **Active** and **Published to Online Store**.
- **The price shows wrong.** The "from $X" is the lowest variant price. Check each variant's price.
- **The "Purchase" button is greyed out.** That's intentional — it activates only after the customer picks a variant.
- **A card appears in the wrong slot (left/middle/right).** Adjust the `card_order` metafield (1 = left, 2 = middle, 3 = right).

## Anchor: how it all fits together

```
Customer picks Camps tab     → reg-cat-summer  OR  reg-cat-one-day-camp
            └─ Subcategory   → reg-cat-{slug}
                └─ Camp tile → reg-camp-{slug}
                    └─ Week  → reg-week-{N}
                        └─ Shows products matching ALL four
                            └─ Sorted left-to-right by card_order metafield
```

Programs skip the week step:

```
Customer picks Programs tab  → reg-cat-{program-slug}
            └─ Dropdown      → reg-cat-{program-slug}
                └─ Tile      → reg-camp-{program-slug}
                    └─ Shows products matching ALL three
```
