// Fix the wrong-type dcway.location metafield, create sample locations using
// the ACTUAL location metaobject field handles, and backfill the test products.

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

// 1. Find + delete the wrong-type dcway.location metafield definition
console.log('→ Looking up dcway.location metafield definition...');
let locDefId = null;
{
  const d = await gql(`{
    metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: "dcway") {
      nodes { id key type { name } }
    }
  }`);
  const def = d.metafieldDefinitions.nodes.find((n) => n.key === 'location');
  if (def) {
    locDefId = def.id;
    console.log(`  ✓ found ${def.id}  type=${def.type.name}`);
  }
}

if (locDefId) {
  console.log('→ Deleting wrong-type definition (and any associated metafield values)...');
  const d = await gql(
    `mutation Del($id: ID!) {
      metafieldDefinitionDelete(id: $id, deleteAllAssociatedMetafields: true) {
        deletedDefinitionId
        userErrors { field message }
      }
    }`,
    { id: locDefId }
  );
  if (!logErrors('delete', d.metafieldDefinitionDelete.userErrors)) {
    console.log(`  ✓ deleted ${d.metafieldDefinitionDelete.deletedDefinitionId}`);
  }
}

// 2. Look up location metaobject definition GID
console.log('→ Looking up location metaobject definition GID...');
let locMetaobjectDefId;
{
  const d = await gql(`{
    metaobjectDefinitions(first: 50) { nodes { id type } }
  }`);
  const def = d.metaobjectDefinitions.nodes.find((n) => n.type === 'location');
  locMetaobjectDefId = def.id;
  console.log(`  ✓ ${locMetaobjectDefId}`);
}

// 3. Re-create dcway.location as metaobject_reference
console.log('→ Re-creating dcway.location as metaobject_reference...');
{
  const d = await gql(
    `mutation Create($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id key type { name } }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        name: 'Location',
        namespace: 'dcway',
        key: 'location',
        type: 'metaobject_reference',
        ownerType: 'PRODUCT',
        access: { storefront: 'PUBLIC_READ' },
        validations: [{ name: 'metaobject_definition_id', value: locMetaobjectDefId }],
      },
    }
  );
  if (!logErrors('create dcway.location', d.metafieldDefinitionCreate.userErrors)) {
    console.log(`  ✓ ${d.metafieldDefinitionCreate.createdDefinition.id}`);
  }
}

// 4. Create 2 sample location metaobject entries — using the ACTUAL field handles
//    that exist on the location metaobject (name, address, city, state, map_url, phone, image, sort_order)
console.log('\n→ Creating sample location entries (matching real field handles)...');
const sampleLocations = [
  {
    handle: 'capitol-hill',
    fields: [
      { key: 'name', value: 'Capitol Hill Field' },
      { key: 'address', value: '700 14th St SE' },
      { key: 'city', value: 'Washington' },
      { key: 'state', value: 'DC' },
      { key: 'phone', value: '(202) 555-0142' },
      { key: 'sort_order', value: '1' },
    ],
  },
  {
    handle: 'navy-yard',
    fields: [
      { key: 'name', value: 'Navy Yard Turf' },
      { key: 'address', value: '1100 New Jersey Ave SE' },
      { key: 'city', value: 'Washington' },
      { key: 'state', value: 'DC' },
      { key: 'phone', value: '(202) 555-0188' },
      { key: 'sort_order', value: '2' },
    ],
  },
];

const locationGids = {};
for (const loc of sampleLocations) {
  const existing = await gql(
    `query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id handle } }`,
    { h: { type: 'location', handle: loc.handle } }
  );
  if (existing.metaobjectByHandle) {
    locationGids[loc.handle] = existing.metaobjectByHandle.id;
    console.log(`  · already exists: ${loc.handle}`);
    continue;
  }
  const d = await gql(
    `mutation Create($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle displayName }
        userErrors { field message }
      }
    }`,
    { metaobject: { type: 'location', handle: loc.handle, fields: loc.fields } }
  );
  if (!logErrors(loc.handle, d.metaobjectCreate.userErrors)) {
    locationGids[loc.handle] = d.metaobjectCreate.metaobject.id;
    console.log(`  ✓ ${loc.handle} → ${d.metaobjectCreate.metaobject.id}`);
  }
}

// 5. Backfill location on the 2 test products
console.log('\n→ Backfilling location on test products...');
const productMappings = [
  { handle: 'art-soccer-summer-camp-week-1', location: 'capitol-hill' },
  { handle: 'skills-clinic-wednesdays', location: 'navy-yard' },
];

for (const m of productMappings) {
  const d = await gql(`query($q:String!){ products(first:1, query:$q){ nodes{ id handle } } }`, { q: `handle:${m.handle}` });
  const product = d.products.nodes[0];
  if (!product || !locationGids[m.location]) {
    console.log(`  ! skip ${m.handle}`);
    continue;
  }
  const r = await gql(
    `mutation Set($metafields:[MetafieldsSetInput!]!){
      metafieldsSet(metafields:$metafields){
        metafields{ id namespace key value }
        userErrors{ field message }
      }
    }`,
    {
      metafields: [{
        ownerId: product.id, namespace: 'dcway', key: 'location',
        type: 'metaobject_reference', value: locationGids[m.location],
      }],
    }
  );
  if (!logErrors(`location → ${m.handle}`, r.metafieldsSet.userErrors)) {
    console.log(`  ✓ ${m.handle} → ${m.location}`);
  }
}

console.log('\nDone.');
