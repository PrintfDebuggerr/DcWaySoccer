# DC Way — Account / Children Data Model (Faz 4 foundation)

The store uses **NEW customer accounts** (Shopify-hosted). The account UI (Children/Membership tabs,
editing) must be delivered by a **Customer Account UI Extension app** OR a 3rd-party customer-fields app
(e.g. Helium Customer Fields). This doc defines the **data contract** so the theme (registration builder,
member pricing) and that app agree on where data lives. Theme reads these via Liquid `customer.metafields`;
no admin scope needed to READ on the storefront.

> The current admin API token lacks `write_customers`, so these customer metafield **definitions must be
> created by the chosen app or by a token with customer scopes.** The theme is built to read them.

---

## 1. Children — `customer.metafields.dcway.children`

- **namespace/key:** `dcway.children`
- **type:** `json` (a list of child objects)
- **storefront access:** must be readable on the storefront (so theme can render the child picker)
- **written by:** the account/fields app when a parent adds/edits a child

```json
[
  {
    "id": "c1",                         // stable id (app-generated)
    "name": "Ada Smith",
    "dob": "2017-05-14",                // ISO 8601 date — source of truth for AGE
    "school_start_year": 2021,          // year the child started PRESCHOOL — source of truth for GRADE
    "gender": "female",
    "school": "Stuart-Hobson",
    "medical": "None",
    "allergies": "Peanuts",
    "emergency": { "name": "Jane Doe", "relationship": "Aunt", "phone": "202-555-0143" }
  }
]
```

**Children Tab full field list (task #2):** Child's Name, Date of Birth, Age (auto, read-only),
School Start Year, Grade (auto, read-only), Gender, School, Medical Issues, Allergies,
Emergency Contact (Name, Relationship to Child, Phone) — with the note that the emergency contact must be
someone OTHER than the parent/guardian on the account.

`age` and `grade` are **never stored** — always derived (below) so they stay correct over time.

---

## 2. Age derivation (DOB → Age)

```
age = full years between dob and today
```
JS: `Math.floor((today - dob) / 31557600000)` then adjust for birthday not yet reached this year.

---

## 3. Grade derivation (School Start Year → Grade), rolls over Sep 1

`school_start_year` (SY) = calendar year the child started **Preschool** (in the fall).

```
currentSchoolStart = (today >= Sep 1 of thisYear) ? thisYear : thisYear - 1
elapsed = currentSchoolStart - SY
```
Grade ladder by `elapsed`:
| elapsed | Grade |
|---|---|
| 0 | Preschool |
| 1 | Pre-K |
| 2 | Kindergarten |
| 3 | 1st Grade |
| n≥3 | (n−2)th Grade |
(Cap at 12th Grade; below 0 → "Not started".)

---

## 4. Membership — `customer.metafields.dcway.membership_expires` / `membership_savings`

Set by the membership app (Faz 3). Theme reads them in `dcway-membership-join` + (future) account tab.
- `dcway.membership_expires` — `date` (12 months from purchase). Active while `>= today`.
- `dcway.membership_savings` — `money`/number (running total saved via the 10% discount).
- Member identity for theme display = customer **tag** `member` (app-assigned). See [[project_membership]].

---

## 5. Order History rename (task #2) — CONSTRAINT

On NEW customer accounts the native order list columns (#, Date, Name, Price, Status) are Shopify-hosted
and **cannot be renamed by the theme**. Renaming to Order Number / Order Date / Program / Total /
Payment Status / Child's Name requires either a Customer Account UI Extension that renders a CUSTOM order
table, or switching to classic accounts. Flag as app-scope.

---

## 6. How the theme already consumes this

- **Registration builder** `dcway-registration-builder` — "Choose Your Child" reads `dcway.children`
  (json) and renders a dropdown (name + auto age); falls back to a free-text field for guests / when no
  children exist. A `preview_children` setting injects sample data for QA. The chosen child's name (and
  age) ride along as line-item properties.
- Member pricing already wired (Faz 3).
