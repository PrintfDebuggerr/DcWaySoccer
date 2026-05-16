// Phase 4A follow-up: create the smart collections + a sample location metaobject entry.
// Idempotent — re-running re-uses existing collections/entries.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const ENDPOINT = `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

function logErrors(label, ue) {
  if (ue && ue.length) {
    console.error(`  ✗ ${label}:`, JSON.stringify(ue, null, 2));
    return true;
  }
  return false;
}

// 1. Look up existing collections by handle
async function findCollection(handle) {
  const d = await gql(`query($q:String!){ collections(first:1, query:$q){ nodes{ id handle title } } }`, { q: `handle:${handle}` });
  return d.collections.nodes[0] || null;
}

// 2. Smart collection definitions — match Phase 2 plan
//    Note: column "PRODUCT_METAFIELD_DEFINITION" requires the metafield definition GID.
//    Get those first.
console.log('→ Looking up product metafield definition GIDs...');
const mfDefs = {};
{
  const d = await gql(`{
    metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: "dcway") {
      nodes { id key }
    }
  }`);
  for (const n of d.metafieldDefinitions.nodes) mfDefs[n.key] = n.id;
  console.log(`  ✓ ${Object.keys(mfDefs).length} dcway.* defs found`);
}

if (!mfDefs.product_kind || !mfDefs.season) {
  console.error('  ✗ product_kind or season metafield def missing — run admin-bootstrap.mjs first.');
  process.exit(1);
}

const collectionSpecs = [
  {
    handle: 'camps-summer',
    title: 'Summer Camps',
    rules: [
      { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'camp', conditionObjectId: mfDefs.product_kind },
      { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'Summer 2026', conditionObjectId: mfDefs.season },
    ],
    appliedDisjunctively: false,
  },
  {
    handle: 'camps-school-year',
    title: 'School-Year Camps',
    rules: [
      { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'camp', conditionObjectId: mfDefs.product_kind },
      { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'NOT_EQUALS', condition: 'Summer 2026', conditionObjectId: mfDefs.season },
    ],
    appliedDisjunctively: false,
  },
  {
    handle: 'camps-one-day',
    title: 'One-Day Camps',
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'one-day' }],
    appliedDisjunctively: false,
  },
  {
    handle: 'programs',
    title: 'Programs',
    rules: [{ column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'program', conditionObjectId: mfDefs.product_kind }],
    appliedDisjunctively: false,
  },
  {
    handle: 'programs-leagues',
    title: 'Leagues',
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'league' }],
    appliedDisjunctively: false,
  },
  {
    handle: 'programs-clinics',
    title: 'Skills Clinics',
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'clinic' }],
    appliedDisjunctively: false,
  },
  {
    handle: 'programs-private',
    title: 'Private Lessons',
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'private-lesson' }],
    appliedDisjunctively: false,
  },
  {
    handle: 'programs-after-school',
    title: 'After-School',
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'after-school' }],
    appliedDisjunctively: false,
  },
  {
    handle: 'membership',
    title: 'Membership',
    rules: [{ column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'membership', conditionObjectId: mfDefs.product_kind }],
    appliedDisjunctively: false,
  },
];

const COLLECTION_CREATE = `
  mutation Create($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle title productsCount { count } }
      userErrors { field message }
    }
  }
`;

console.log('→ Creating smart collections...');
for (const spec of collectionSpecs) {
  const existing = await findCollection(spec.handle);
  if (existing) {
    console.log(`  · already exists: ${spec.handle}`);
    continue;
  }
  const d = await gql(COLLECTION_CREATE, {
    input: {
      handle: spec.handle,
      title: spec.title,
      ruleSet: { appliedDisjunctively: spec.appliedDisjunctively, rules: spec.rules },
    },
  });
  if (logErrors(spec.handle, d.collectionCreate.userErrors)) continue;
  const c = d.collectionCreate.collection;
  console.log(`  ✓ ${c.handle} → ${c.productsCount.count} products matched`);
}

// Manual collections (no rules)
const manualSpecs = [
  { handle: 'merch', title: 'Merchandise' },
  { handle: 'featured-merch', title: 'Featured Merch (homepage)' },
];
for (const spec of manualSpecs) {
  const existing = await findCollection(spec.handle);
  if (existing) {
    console.log(`  · already exists: ${spec.handle}`);
    continue;
  }
  const d = await gql(COLLECTION_CREATE, {
    input: { handle: spec.handle, title: spec.title },
  });
  if (logErrors(spec.handle, d.collectionCreate.userErrors)) continue;
  console.log(`  ✓ ${spec.handle} (manual)`);
}

// 3. Sample location metaobject entry
console.log('\n→ Creating sample location entry...');
const METAOBJECT_CREATE = `
  mutation Create($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message }
    }
  }
`;

async function findMetaobject(type, handle) {
  const d = await gql(`query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id handle } }`, {
    h: { type, handle },
  });
  return d.metaobjectByHandle;
}

const sampleLocations = [
  {
    handle: 'capitol-hill',
    fields: [
      { key: 'name', value: 'Capitol Hill Field' },
      { key: 'address', value: '700 14th St SE\nWashington, DC 20003' },
      { key: 'hours', value: 'Mon–Fri 4–8pm · Sat–Sun 9am–5pm' },
      { key: 'position', value: '1' },
    ],
  },
  {
    handle: 'navy-yard',
    fields: [
      { key: 'name', value: 'Navy Yard Turf' },
      { key: 'address', value: '1100 New Jersey Ave SE\nWashington, DC 20003' },
      { key: 'hours', value: 'Mon–Fri 5–9pm · Weekends 10am–6pm' },
      { key: 'position', value: '2' },
    ],
  },
];

const locationGids = {};
for (const loc of sampleLocations) {
  const existing = await findMetaobject('location', loc.handle);
  if (existing) {
    console.log(`  · already exists: ${loc.handle} → ${existing.id}`);
    locationGids[loc.handle] = existing.id;
    continue;
  }
  const d = await gql(METAOBJECT_CREATE, {
    metaobject: { type: 'location', handle: loc.handle, fields: loc.fields },
  });
  if (logErrors(loc.handle, d.metaobjectCreate.userErrors)) continue;
  console.log(`  ✓ ${loc.handle} → ${d.metaobjectCreate.metaobject.id}`);
  locationGids[loc.handle] = d.metaobjectCreate.metaobject.id;
}

// 4. Backfill: assign location to the 2 test products created earlier
console.log('\n→ Backfilling location on test products...');
const METAFIELDS_SET = `
  mutation Set($metafields:[MetafieldsSetInput!]!){
    metafieldsSet(metafields:$metafields){
      metafields{ id namespace key value }
      userErrors{ field message }
    }
  }
`;

const productMappings = [
  { handle: 'art-soccer-summer-camp-week-1', location: 'capitol-hill' },
  { handle: 'skills-clinic-wednesdays', location: 'navy-yard' },
];

for (const m of productMappings) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id handle } } }`, { q: `handle:${m.handle}` });
  const product = d.products.nodes[0];
  if (!product) {
    console.log(`  ! no product ${m.handle}`);
    continue;
  }
  const locGid = locationGids[m.location];
  if (!locGid) {
    console.log(`  ! no location gid for ${m.location}`);
    continue;
  }
  const r = await gql(METAFIELDS_SET, {
    metafields: [{ ownerId: product.id, namespace: 'dcway', key: 'location', type: 'metaobject_reference', value: locGid }],
  });
  if (!logErrors(`location → ${m.handle}`, r.metafieldsSet.userErrors)) {
    console.log(`  ✓ ${m.handle} → ${m.location}`);
  }
}

console.log('\nDone.');
