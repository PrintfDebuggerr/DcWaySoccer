// Phase 4B step 1: refactor 3 separate weekly camp products into 1 product with 3 variants.
// Deletes art-soccer-summer-camp-week-1/2 (and optionally week-3 if it exists),
// creates art-soccer-summer-camp with 3 weekly variants. Auto-publishes to Online Store.

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

// 0. Lookup Online Store publication and primary location (needed for variants/inventory)
console.log('→ Looking up Online Store publication + primary location...');
let onlineStoreId, primaryLocationId;
{
  const d = await gql(`{
    publications(first: 10) { nodes { id name } }
    locations(first: 10) { nodes { id name isPrimary } }
  }`);
  onlineStoreId = d.publications.nodes.find((p) => p.name === 'Online Store').id;
  primaryLocationId = d.locations.nodes.find((l) => l.isPrimary)?.id || d.locations.nodes[0].id;
  console.log(`  ✓ Online Store: ${onlineStoreId}`);
  console.log(`  ✓ Location: ${primaryLocationId}`);
}

// 1. Delete the old per-week products
const obsoleteHandles = ['art-soccer-summer-camp-week-1', 'art-soccer-summer-camp-week-2'];
console.log('\n→ Deleting obsolete per-week products...');
for (const handle of obsoleteHandles) {
  const d = await gql(
    `query($q:String!){ products(first:1, query:$q){ nodes{ id handle } } }`,
    { q: `handle:${handle}` }
  );
  const p = d.products.nodes[0];
  if (!p) { console.log(`  · not found: ${handle}`); continue; }
  const r = await gql(
    `mutation Del($input: ProductDeleteInput!){ productDelete(input: $input){ deletedProductId userErrors{ field message } } }`,
    { input: { id: p.id } }
  );
  if (!logErrors(handle, r.productDelete.userErrors)) console.log(`  ✓ deleted ${handle}`);
}

// 2. Look up location metaobject GID for capitol-hill
console.log('\n→ Looking up capitol-hill location metaobject...');
let capitolHillGid;
{
  const d = await gql(
    `query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id } }`,
    { h: { type: 'location', handle: 'capitol-hill' } }
  );
  capitolHillGid = d.metaobjectByHandle.id;
  console.log(`  ✓ ${capitolHillGid}`);
}

// 3. Create the consolidated product with 3 weekly variants in a single productSet call
console.log('\n→ Creating consolidated art-soccer-summer-camp product...');
const PRODUCT_SET = `
  mutation Set($product: ProductSetInput!) {
    productSet(input: $product) {
      product {
        id handle title status
        variants(first: 10) { nodes { id title price selectedOptions { name value } } }
      }
      userErrors { field message }
    }
  }
`;

const productInput = {
  handle: 'art-soccer-summer-camp',
  title: 'Art Soccer Summer Camp',
  vendor: 'DC Way Soccer',
  productType: 'Camp',
  status: 'ACTIVE',
  tags: ['camp', 'summer', 'half-day'],
  descriptionHtml:
    '<p>Half-day soccer-meets-art camp for ages 5–8. Mornings of soccer skills and games, afternoons of art projects inspired by the day’s session. Pick a week below to lock in your spot.</p>',
  productOptions: [
    {
      name: 'Week',
      values: [
        { name: 'Week 1 — June 22' },
        { name: 'Week 2 — June 29' },
        { name: 'Week 3 — July 6' },
      ],
    },
  ],
  variants: [
    {
      optionValues: [{ optionName: 'Week', name: 'Week 1 — June 22' }],
      price: '275.00',
      inventoryItem: { tracked: true },
      inventoryQuantities: [{ name: 'available', quantity: 18, locationId: primaryLocationId }],
    },
    {
      optionValues: [{ optionName: 'Week', name: 'Week 2 — June 29' }],
      price: '275.00',
      inventoryItem: { tracked: true },
      inventoryQuantities: [{ name: 'available', quantity: 20, locationId: primaryLocationId }],
    },
    {
      optionValues: [{ optionName: 'Week', name: 'Week 3 — July 6' }],
      price: '295.00',
      inventoryItem: { tracked: true },
      inventoryQuantities: [{ name: 'available', quantity: 12, locationId: primaryLocationId }],
    },
  ],
  metafields: [
    { namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: 'camp' },
    { namespace: 'dcway', key: 'season', type: 'single_line_text_field', value: 'Summer 2026' },
    { namespace: 'dcway', key: 'age_range', type: 'single_line_text_field', value: '5–8 yrs' },
    { namespace: 'dcway', key: 'date_range_label', type: 'single_line_text_field', value: 'June 22 – July 10' },
    { namespace: 'dcway', key: 'location', type: 'metaobject_reference', value: capitolHillGid },
  ],
};

const ps = await gql(PRODUCT_SET, { product: productInput });
if (logErrors('productSet', ps.productSet.userErrors)) process.exit(1);
const product = ps.productSet.product;
console.log(`  ✓ ${product.handle} (${product.id}) status=${product.status}`);
for (const v of product.variants.nodes) {
  console.log(`    · ${v.title} → $${v.price}`);
}

// 4. Publish to Online Store
console.log('\n→ Publishing to Online Store...');
const pub = await gql(
  `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors{ field message } }
  }`,
  { id: product.id, input: [{ publicationId: onlineStoreId }] }
);
if (!logErrors('publish', pub.publishablePublish.userErrors)) console.log(`  ✓ published`);

console.log('\nDone.');
