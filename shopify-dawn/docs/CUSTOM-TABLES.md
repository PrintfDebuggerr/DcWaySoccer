# Custom Tables (task #22) — league fixtures, schedules, any data table

A metaobject-driven, admin-editable table system. Build league schedules, game-day
results, price grids, or any tabular data — no code, no plugin. Mirrors the WordPress
"Superb Tables" league pages.

## How it works

- **Data** lives in **Content → Metaobjects → Custom table** (`dcway_table`). One entry = one table.
- **Display** is the **Custom table** section (`dcway-custom-table`). Add it to any page in the
  theme editor. It renders either *one* picked table, or *every* table in a **group** (in order).

## Each table entry has

| Field | What it does |
|---|---|
| **Heading** | Title shown above the table (e.g. `Game Day 1 - Mar 21`). |
| **Column headers** | Pipe-separated header labels, e.g. `Time\|Field\|Game\|\|Scores`. Leave a cell empty (`\|\|`) to make the previous header span it (so `Game` covers the two team columns). Leave the whole field blank for a no-header grid (like the teams roster). |
| **Rows** | One row per line; separate cells with `\|`. e.g. `9:00 AM\|10\|Chisholm\|Tigers\|5-3`. An empty last cell (`...\|Tigers\|`) shows a blank score. |
| **Group key** | Tables sharing a group render together on one page section, ordered by Display order. e.g. `boys-league-1-2`. |
| **Display order** | Sort order within the group (0 first). |
| **Caption / note** | Optional small text under the table. |
| **Emphasize last column** | Bold + orange last column (use for Scores). |

## Add a new league page

1. **Create the tables** in Content → Metaobjects → Custom table. Give them all the same
   **Group key** (e.g. `girls-league-3-4`) and set **Display order** 0, 1, 2…
2. In the theme editor, **Add section → Custom table** to the page (or duplicate the existing
   `templates/page.league-boys-1-2.json` template).
3. Set the section's **Group key** to match. Done — all tables render in order.

To show just one table anywhere, leave Group key blank and pick it under **Single table**.

## Example: a game-day table

- Heading: `Game Day 1 - Mar 21`
- Column headers: `Time|Field|Game||Scores`
- Rows:
  ```
  9:00 AM|10|Chisholm|Tigers|5-3
  10:00 AM|8|Maury|Dragon Bears|6-6
  ```
- Group key: `boys-league-1-2`  ·  Display order: `1`  ·  Emphasize last column: on

## Reseed the sample data

`node scripts/admin-bootstrap-tables.mjs` (idempotent upsert) recreates the definition and the
`boys-league-1-2` fixtures. Safe to re-run.
