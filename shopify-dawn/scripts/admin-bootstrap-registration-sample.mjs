// Registration page Phase 1: seed ONE sample product so the new filter section has
// real data to render. Client will duplicate this in Shopify admin to fill the
// remaining camp×week×type slots.
//
// Product: 2026 Stuart-Hobson Soccer, Art & Explore Summer Camp - Week 1 (Full Week)
//   - 1 product, 11 variants on a single "Session" option
//   - Tags drive the registration-filter section: reg-camp-*, reg-week-*, reg-type-*, reg-cat-*
//   - Metafields drive the card meta lines (location/dates/ages) + card sort order
//
// Idempotent: re-running upserts via productSet on the known handle.

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  x ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

// ---------- Lookups ----------
console.log('-> Looking up Online Store publication + primary location...');
let onlineStoreId, primaryLocationId;
{
  const d = await gql(`{
    publications(first: 10) { nodes { id name } }
    locations(first: 10) { nodes { id name isPrimary } }
  }`);
  onlineStoreId = d.publications.nodes.find((p) => p.name === 'Online Store').id;
  primaryLocationId = d.locations.nodes.find((l) => l.isPrimary)?.id || d.locations.nodes[0].id;
  console.log(`  + Online Store: ${onlineStoreId}`);
  console.log(`  + Location:     ${primaryLocationId}`);
}

// ---------- Smart collection (tag = "reg") ----------
console.log('\n-> Ensuring "registration-all" smart collection (tag=reg)...');
{
  const COLL_HANDLE = 'registration-all';
  const existing = await gql(
    `query($h:String!){ collectionByHandle(handle:$h){ id handle } }`,
    { h: COLL_HANDLE }
  );
  if (existing.collectionByHandle) {
    console.log(`  . already exists: ${existing.collectionByHandle.id}`);
  } else {
    const r = await gql(
      `mutation Create($input: CollectionInput!) {
        collectionCreate(input: $input) { collection { id handle } userErrors { field message } }
      }`,
      {
        input: {
          title: 'Registration (all)',
          handle: COLL_HANDLE,
          descriptionHtml: '<p>Auto-populated: all products tagged "reg". Used by the registration page filter section.</p>',
          ruleSet: {
            appliedDisjunctively: false,
            rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'reg' }],
          },
        },
      }
    );
    if (!logErrors('collectionCreate', r.collectionCreate.userErrors)) {
      console.log(`  + created: ${r.collectionCreate.collection.id}`);
      // Publish to Online Store
      const pub = await gql(
        `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) { userErrors{ field message } }
        }`,
        { id: r.collectionCreate.collection.id, input: [{ publicationId: onlineStoreId }] }
      );
      logErrors('collectionPublish', pub.publishablePublish.userErrors);
    }
  }
}

// ---------- Spec ----------
const HANDLE = 'reg-stuart-hobson-week-1-full-week';

// Variant prices from WP reference. "Full Week (9-3 pm)" is the from-$30 anchor.
const sessions = [
  { name: 'Full Week (9-3 pm)',              price: '30.00',  stock: 20 },
  { name: 'Full Week + T-shirt',             price: '45.00',  stock: 20 },
  { name: 'Full Week + Soccer Ball',         price: '60.00',  stock: 20 },
  { name: 'Extended Full Week (9-5:30 pm)',  price: '45.00',  stock: 20 },
  { name: 'Extended Full Week + T-shirt',    price: '60.00',  stock: 20 },
  { name: 'First Session (9-12 pm)',         price: '20.00',  stock: 20 },
  { name: 'First Session + T-shirt',         price: '35.00',  stock: 20 },
  { name: 'Second Session (12-3 pm)',        price: '20.00',  stock: 20 },
  { name: 'Second Session + T-shirt',        price: '35.00',  stock: 20 },
  { name: 'Before Care (8-9 am)',            price: '10.00',  stock: 20 },
  { name: 'After Care (3-5:30 pm)',          price: '15.00',  stock: 20 },
];

const productInput = {
  handle: HANDLE,
  title: '2026 Stuart-Hobson Soccer, Art & Explore Summer Camp - Week 1 (Full Week)',
  vendor: 'DC Way Soccer',
  productType: 'Camp Registration',
  status: 'ACTIVE',
  tags: [
    'reg',
    'reg-cat-summer',
    'reg-camp-stuart-hobson',
    'reg-week-1',
    'reg-type-full-week',
  ],
  descriptionHtml:
    '<p>Soccer, art, and exploration at Stuart-Hobson Middle School. Week 1 runs June 16, 18, 19. Pick the session length that fits your schedule.</p>',
  productOptions: [
    {
      name: 'Session',
      values: sessions.map((s) => ({ name: s.name })),
    },
  ],
  variants: sessions.map((s) => ({
    optionValues: [{ optionName: 'Session', name: s.name }],
    price: s.price,
    inventoryItem: { tracked: true },
    inventoryQuantities: [{ name: 'available', quantity: s.stock, locationId: primaryLocationId }],
  })),
  metafields: [
    { namespace: 'dcway_registration', key: 'location_label', type: 'single_line_text_field',
      value: 'Stuart-Hobson Middle School (Soccer, Art & Explore Camp)' },
    { namespace: 'dcway_registration', key: 'dates_label', type: 'single_line_text_field',
      value: 'June 16, 18, 19' },
    { namespace: 'dcway_registration', key: 'ages_label', type: 'single_line_text_field',
      value: 'Ages 3-12' },
    { namespace: 'dcway_registration', key: 'card_order', type: 'number_integer',
      value: '1' },
    { namespace: 'dcway_registration', key: 'camp_label', type: 'single_line_text_field',
      value: 'Stuart-Hobson Soccer, Art & Explore Summer Camp' },
    { namespace: 'dcway_registration', key: 'card_type_label', type: 'single_line_text_field',
      value: 'Full Week' },
  ],
};

// ---------- Upsert ----------
console.log(`\n-> productSet ${HANDLE}...`);
const PRODUCT_SET = `
  mutation Set($product: ProductSetInput!) {
    productSet(input: $product) {
      product {
        id handle title status tags
        variants(first: 50) { nodes { id title price selectedOptions { name value } } }
      }
      userErrors { field message }
    }
  }
`;
const ps = await gql(PRODUCT_SET, { product: productInput });
if (logErrors('productSet', ps.productSet.userErrors)) process.exit(1);
const product = ps.productSet.product;
console.log(`  + ${product.handle} (${product.id}) status=${product.status}`);
console.log(`  + ${product.variants.nodes.length} variants:`);
for (const v of product.variants.nodes) {
  console.log(`     . ${v.title.padEnd(36)} $${v.price}`);
}

// ---------- Publish ----------
console.log('\n-> Publishing to Online Store...');
const pub = await gql(
  `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors{ field message } }
  }`,
  { id: product.id, input: [{ publicationId: onlineStoreId }] }
);
if (!logErrors('publish', pub.publishablePublish.userErrors)) console.log('  + published');

console.log('\nDone.');
console.log(`\nView in admin: https://${env.SHOPIFY_STORE}/admin/products/${product.id.split('/').pop()}`);
