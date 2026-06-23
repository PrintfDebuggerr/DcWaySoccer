// Bootstrap the Custom Table Builder (task #22):
//   1. Create the `dcway_table` metaobject definition (if missing).
//   2. Upsert the real "1st-2nd Grade Boys" league fixtures (teams roster + 7 game days)
//      from the WordPress reference, so the section has working data to render.
//
// Data model (all admin-editable in Content → Metaobjects → Custom table):
//   heading          single line   — title shown above the table
//   columns          single line   — pipe-separated header labels (empty cells allowed: "Time|Field|Game||Scores")
//   rows             multi line    — one row per line, cells separated by "|"
//   group            single line   — bundles tables onto one page (section renders all of a group, sorted)
//   sort_order       integer       — order within the group
//   note             single line   — optional caption under the table
//   accent_last_col  boolean       — visually emphasize the last column (e.g. Scores)
//
// Run: node scripts/admin-bootstrap-tables.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);

const ENDPOINT = `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
const gql = async (q, v = {}) => {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query: q, variables: v }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors, null, 2));
  return j.data;
};
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  ✗ ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

// ───────────── League fixtures (verbatim from WP reference) ─────────────
const GROUP = 'boys-league-1-2';

// Each game day: rows of [Time, Field, Home, Away, Score]
const GAME_DAYS = [
  { heading: 'Game Day 1 - Mar 21', rows: [['9:00 AM', '10', 'Chisholm', 'Tigers', '5-3'], ['10:00 AM', '8', 'Maury', 'Dragon Bears', '6-6'], ['11:00 AM', '8', 'SWS', 'Monarchs', '4-0'], ['11:00 AM', '10', 'CHDS', 'United', '6-5']] },
  { heading: 'Game Day 2 - Mar 28', rows: [['9:00 AM', '10', 'SWS', 'Chisholm', '3-8'], ['9:00 AM', '11', 'CHDS', 'Maury', '4-5'], ['11:00 AM', '8', 'Monarchs', 'Dragon Bears', '3-7'], ['11:00 AM', '10', 'United', 'Tigers', '1-8']] },
  { heading: 'Game Day 3 - Apr 11', rows: [['9:00 AM', '10', 'Chisholm', 'CHDS', '15-0'], ['10:00 AM', '8', 'Maury', 'Monarchs', '5-7'], ['11:00 AM', '8', 'Tigers', 'SWS', '2-3'], ['11:00 AM', '10', 'Dragon Bears', 'United', '8-3']] },
  { heading: 'Game Day 4 - Apr 25', rows: [['9:00 AM', '10', 'Maury', 'Chisholm', '4-9'], ['10:00 AM', '8', 'United', 'Monarchs', '2-2'], ['11:00 AM', '8', 'SWS', 'Dragon Bears', '2-5'], ['11:00 AM', '10', 'CHDS', 'Tigers', '2-6']] },
  { heading: 'Game Day 5 - May 2', rows: [['9:00 AM', '10', 'Chisholm', 'United', '10-2'], ['10:00 AM', '8', 'Maury', 'SWS', '6-4'], ['11:00 AM', '8', 'Monarchs', 'CHDS', '6-1'], ['11:00 AM', '10', 'Tigers', 'Dragon Bears', '9-10']] },
  { heading: 'Game Day 6 - May 9', rows: [['9:00 AM', '10', 'Dragon Bears', 'Chisholm', ''], ['10:00 AM', '8', 'United', 'Maury', ''], ['11:00 AM', '8', 'SWS', 'CHDS', ''], ['11:00 AM', '10', 'Tigers', 'Monarchs', '']] },
  { heading: 'Game Day 7 - May 16', rows: [['9:00 AM', '10', 'Monarchs', 'Chisholm', ''], ['10:00 AM', '8', 'Tigers', 'Maury', ''], ['11:00 AM', '8', 'Dragon Bears', 'CHDS', ''], ['11:00 AM', '10', 'United', 'SWS', '']] },
];

// Build the upsert list. sort_order 0 = teams roster, then game days 1..7.
const TABLES = [
  {
    handle: 'boys-1-2-teams',
    heading: '1st-2nd Grade Boys Teams',
    columns: '', // no header row — just the roster grid
    rows: [['Monarchs', 'SWS', 'CHDS', 'Maury'], ['Chisholm', 'Tigers', 'Dragon Bears', 'United']],
    sort_order: 0,
    accent_last_col: false,
    note: '',
  },
  ...GAME_DAYS.map((g, i) => ({
    handle: `boys-1-2-day-${i + 1}`,
    heading: g.heading,
    // "Game" spans the two team columns (empty header cell → colspan merge in the section).
    columns: 'Time|Field|Game||Scores',
    rows: g.rows,
    sort_order: i + 1,
    accent_last_col: true,
    note: '',
  })),
];

// Pipe-encode rows: cells joined by "|", rows joined by newline.
const encodeRows = (grid) => grid.map((r) => r.join('|')).join('\n');

// ───────────── 1. Ensure dcway_table metaobject definition ─────────────
console.log('→ Ensuring dcway_table metaobject definition...');
const DEF_CREATE = `
  mutation Create($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;
const defs = await gql(`{ metaobjectDefinitions(first:100){ nodes{ id type } } }`);
let defId = defs.metaobjectDefinitions.nodes.find((n) => n.type === 'dcway_table')?.id;
if (defId) {
  console.log(`  · already exists: dcway_table → ${defId}`);
} else {
  const r = await gql(DEF_CREATE, {
    definition: {
      name: 'Custom table',
      type: 'dcway_table',
      access: { storefront: 'PUBLIC_READ' },
      capabilities: { publishable: { enabled: true } },
      displayNameKey: 'heading',
      fieldDefinitions: [
        { key: 'heading', name: 'Heading', type: 'single_line_text_field', required: true, description: 'Title shown above the table.' },
        { key: 'columns', name: 'Column headers', type: 'single_line_text_field', description: 'Pipe-separated header labels, e.g. "Time|Field|Game||Scores". Leave a cell empty between two pipes.' },
        { key: 'rows', name: 'Rows', type: 'multi_line_text_field', description: 'One row per line. Separate cells with "|". e.g. "9:00 AM|10|Chisholm|Tigers|5-3".' },
        { key: 'group', name: 'Group key', type: 'single_line_text_field', description: 'Tables sharing a group render together on the same page section, ordered by Display order.' },
        { key: 'sort_order', name: 'Display order', type: 'number_integer' },
        { key: 'note', name: 'Caption / note', type: 'single_line_text_field', description: 'Optional small text under the table.' },
        { key: 'accent_last_col', name: 'Emphasize last column', type: 'boolean', description: 'Highlight the final column (e.g. Scores).' },
      ],
    },
  });
  if (logErrors('dcway_table def', r.metaobjectDefinitionCreate.userErrors)) process.exit(1);
  defId = r.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`  ✓ created dcway_table → ${defId}`);
}

// ───────────── 2. Upsert league tables ─────────────
const MO_UPSERT = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message code }
    }
  }
`;

console.log(`\n→ Upserting ${TABLES.length} tables (group: ${GROUP})...`);
for (const t of TABLES) {
  const r = await gql(MO_UPSERT, {
    handle: { type: 'dcway_table', handle: t.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'heading', value: t.heading },
        { key: 'columns', value: t.columns },
        { key: 'rows', value: encodeRows(t.rows) },
        { key: 'group', value: GROUP },
        { key: 'sort_order', value: String(t.sort_order) },
        { key: 'note', value: t.note },
        { key: 'accent_last_col', value: String(t.accent_last_col) },
      ],
    },
  });
  if (logErrors(`upsert ${t.handle}`, r.metaobjectUpsert.userErrors)) continue;
  console.log(`  ✓ ${t.handle} → ${r.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone. Render via shop.metaobjects.dcway_table.values, filtered by group, sorted by sort_order.');
