// Phase 4B step 2-4: create camp_week + schedule_row metaobject definitions,
// seed sample entries, attach to art-soccer-summer-camp via dcway.weeks + dcway.daily_schedule
// metafields. Also create the dcway.weeks + dcway.daily_schedule metafield definitions
// if missing. All entries published as ACTIVE so storefront sees them.

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

// ───────────── 1. Metaobject definitions ─────────────
console.log('→ Creating camp_week + schedule_row metaobject definitions...');
const METAOBJECT_DEF_CREATE = `
  mutation Create($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;

async function ensureMetaobjectDef(spec) {
  const existing = await gql(`{ metaobjectDefinitions(first:50){ nodes{ id type } } }`);
  const found = existing.metaobjectDefinitions.nodes.find((n) => n.type === spec.type);
  if (found) {
    console.log(`  · already exists: ${spec.type} → ${found.id}`);
    return found.id;
  }
  const r = await gql(METAOBJECT_DEF_CREATE, { definition: spec });
  if (logErrors(spec.type, r.metaobjectDefinitionCreate.userErrors)) return null;
  console.log(`  ✓ created ${spec.type} → ${r.metaobjectDefinitionCreate.metaobjectDefinition.id}`);
  return r.metaobjectDefinitionCreate.metaobjectDefinition.id;
}

const campWeekDefId = await ensureMetaobjectDef({
  name: 'Camp week',
  type: 'camp_week',
  access: { storefront: 'PUBLIC_READ' },
  capabilities: { publishable: { enabled: true } },
  displayNameKey: 'title',
  fieldDefinitions: [
    { key: 'week_number', name: 'Week number', type: 'number_integer', required: true },
    { key: 'title', name: 'Title', type: 'single_line_text_field', required: true },
    { key: 'date_label', name: 'Date label', type: 'single_line_text_field', required: true },
    { key: 'image', name: 'Image', type: 'file_reference', validations: [{ name: 'file_type_options', value: '["Image"]' }] },
    { key: 'description', name: 'Description', type: 'multi_line_text_field' },
  ],
});

const scheduleRowDefId = await ensureMetaobjectDef({
  name: 'Schedule row',
  type: 'schedule_row',
  access: { storefront: 'PUBLIC_READ' },
  capabilities: { publishable: { enabled: true } },
  displayNameKey: 'activity',
  fieldDefinitions: [
    { key: 'time', name: 'Time', type: 'single_line_text_field', required: true },
    { key: 'activity', name: 'Activity', type: 'single_line_text_field', required: true },
    { key: 'sort_order', name: 'Sort order', type: 'number_integer' },
  ],
});

if (!campWeekDefId || !scheduleRowDefId) { console.error('Definition setup failed.'); process.exit(1); }

// ───────────── 2. Product metafield definitions for weeks + daily_schedule ─────────────
console.log('\n→ Ensuring dcway.weeks + dcway.daily_schedule metafield definitions...');
const MF_DEF_CREATE = `
  mutation Create($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id }
      userErrors { field message code }
    }
  }
`;
for (const spec of [
  { name: 'Weeks', namespace: 'dcway', key: 'weeks', type: 'list.metaobject_reference', ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' }, validations: [{ name: 'metaobject_definition_id', value: campWeekDefId }] },
  { name: 'Daily schedule', namespace: 'dcway', key: 'daily_schedule', type: 'list.metaobject_reference', ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' }, validations: [{ name: 'metaobject_definition_id', value: scheduleRowDefId }] },
]) {
  const r = await gql(MF_DEF_CREATE, { definition: spec });
  if (r.metafieldDefinitionCreate.createdDefinition) {
    console.log(`  ✓ created dcway.${spec.key}`);
  } else {
    const taken = r.metafieldDefinitionCreate.userErrors.find((e) => e.code === 'TAKEN');
    if (taken) console.log(`  · already exists: dcway.${spec.key}`);
    else logErrors(`dcway.${spec.key}`, r.metafieldDefinitionCreate.userErrors);
  }
}

// ───────────── 3. Seed camp_week + schedule_row entries (ACTIVE) ─────────────
console.log('\n→ Seeding camp_week entries...');
const METAOBJECT_CREATE = `
  mutation Create($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message code }
    }
  }
`;

async function ensureMetaobject(type, handle, fields) {
  const ex = await gql(
    `query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id handle } }`,
    { h: { type, handle } }
  );
  if (ex.metaobjectByHandle) {
    console.log(`  · already exists: ${type}/${handle}`);
    return ex.metaobjectByHandle.id;
  }
  const r = await gql(METAOBJECT_CREATE, {
    metaobject: {
      type, handle, fields,
      capabilities: { publishable: { status: 'ACTIVE' } }, // <-- avoid the DRAFT pitfall from Phase 4A
    },
  });
  if (logErrors(`${type}/${handle}`, r.metaobjectCreate.userErrors)) return null;
  console.log(`  ✓ ${type}/${handle} → ${r.metaobjectCreate.metaobject.id}`);
  return r.metaobjectCreate.metaobject.id;
}

const campWeekSeeds = [
  { handle: 'art-soccer-week-1', fields: [
    { key: 'week_number', value: '1' },
    { key: 'title', value: 'World Cup Week' },
    { key: 'date_label', value: 'June 22 – June 26' },
    { key: 'description', value: 'Each day a different country: jerseys, art projects, and tournament-style games inspired by World Cup history.' },
  ]},
  { handle: 'art-soccer-week-2', fields: [
    { key: 'week_number', value: '2' },
    { key: 'title', value: 'Sports Around the World' },
    { key: 'date_label', value: 'June 29 – July 3' },
    { key: 'description', value: 'Field hockey, rugby, and Gaelic football meet soccer fundamentals. Art projects: international flags + national crests.' },
  ]},
  { handle: 'art-soccer-week-3', fields: [
    { key: 'week_number', value: '3' },
    { key: 'title', value: 'Mural & Tournament Week' },
    { key: 'date_label', value: 'July 6 – July 10' },
    { key: 'description', value: 'Group mural project culminates in a Friday family-day tournament + gallery walk. Capstone week of the program.' },
  ]},
];

const weekGids = [];
for (const w of campWeekSeeds) {
  const id = await ensureMetaobject('camp_week', w.handle, w.fields);
  if (id) weekGids.push(id);
}

console.log('\n→ Seeding schedule_row entries (typical day)...');
const scheduleSeeds = [
  { handle: 'asc-row-1', fields: [{ key: 'time', value: '9:00 AM' }, { key: 'activity', value: 'Drop-off & warm-up' }, { key: 'sort_order', value: '1' }] },
  { handle: 'asc-row-2', fields: [{ key: 'time', value: '9:30 AM' }, { key: 'activity', value: 'Skill stations: dribbling, passing, shooting' }, { key: 'sort_order', value: '2' }] },
  { handle: 'asc-row-3', fields: [{ key: 'time', value: '11:00 AM' }, { key: 'activity', value: 'Small-sided games' }, { key: 'sort_order', value: '3' }] },
  { handle: 'asc-row-4', fields: [{ key: 'time', value: '12:00 PM' }, { key: 'activity', value: 'Lunch + free play' }, { key: 'sort_order', value: '4' }] },
  { handle: 'asc-row-5', fields: [{ key: 'time', value: '12:45 PM' }, { key: 'activity', value: 'Art workshop (theme of the week)' }, { key: 'sort_order', value: '5' }] },
  { handle: 'asc-row-6', fields: [{ key: 'time', value: '2:00 PM' }, { key: 'activity', value: 'Scrimmage tournament' }, { key: 'sort_order', value: '6' }] },
  { handle: 'asc-row-7', fields: [{ key: 'time', value: '2:50 PM' }, { key: 'activity', value: 'Cool-down & pickup' }, { key: 'sort_order', value: '7' }] },
];

const scheduleGids = [];
for (const s of scheduleSeeds) {
  const id = await ensureMetaobject('schedule_row', s.handle, s.fields);
  if (id) scheduleGids.push(id);
}

// ───────────── 4. Attach dcway.weeks + dcway.daily_schedule to art-soccer-summer-camp ─────────────
console.log('\n→ Attaching weeks + daily_schedule metafields to art-soccer-summer-camp...');
const productLookup = await gql(
  `query($q:String!){ products(first:1, query:$q){ nodes{ id handle } } }`,
  { q: 'handle:art-soccer-summer-camp' }
);
const product = productLookup.products.nodes[0];
if (!product) { console.error('  ✗ product not found'); process.exit(1); }

const METAFIELDS_SET = `
  mutation Set($metafields:[MetafieldsSetInput!]!){
    metafieldsSet(metafields:$metafields){
      metafields{ id namespace key }
      userErrors{ field message }
    }
  }
`;

const r = await gql(METAFIELDS_SET, {
  metafields: [
    { ownerId: product.id, namespace: 'dcway', key: 'weeks',
      type: 'list.metaobject_reference', value: JSON.stringify(weekGids) },
    { ownerId: product.id, namespace: 'dcway', key: 'daily_schedule',
      type: 'list.metaobject_reference', value: JSON.stringify(scheduleGids) },
  ],
});
if (!logErrors('attach', r.metafieldsSet.userErrors)) {
  console.log(`  ✓ attached ${weekGids.length} weeks + ${scheduleGids.length} schedule rows`);
}

console.log('\nDone.');
