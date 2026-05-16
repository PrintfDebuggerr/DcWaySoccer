// Seed the DC Way Membership product so /pages/membership renders a real
// featured-product card with title, $100 price, description, and Add-to-Cart.
//
// Creates 1 single-SKU product, idempotent on handle:
//   - DC Way Membership   ($100, dcway.product_kind=membership, untracked inventory)
//
// Run: node scripts/admin-seed-membership.mjs

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

const spec = {
  handle: 'dc-way-membership',
  title: 'DC Way Membership',
  productType: 'Membership',
  tags: ['membership'],
  descriptionHtml: [
    '<p>Join the DC Way family for a full year of benefits:</p>',
    '<ul>',
    '<li><strong>10% off</strong> every camp, league, and clinic for 12 months</li>',
    '<li>A <strong>welcome goody bag</strong> with DC Way gear</li>',
    '<li>Access to our <strong>year-round community</strong> of families and coaches</li>',
    '</ul>',
    '<p>Membership lasts one year from the date of purchase.</p>',
  ].join(''),
  price: '100.00',
};

const PRODUCT_BY_HANDLE = `
  query($q: String!) {
    products(first: 1, query: $q) { nodes { id handle } }
  }
`;
const PRODUCT_SET = `
  mutation ProductSet($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle title variants(first: 5) { nodes { id title price } } }
      userErrors { field message }
    }
  }
`;
const METAFIELDS_SET = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`;
const COLLECTION_BY_HANDLE = `
  query($h: String!) { collectionByHandle(handle: $h) { id handle title } }
`;
const COLLECTION_ADD_PRODUCTS = `
  mutation CollAdd($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection { id productsCount { count } }
      userErrors { field message }
    }
  }
`;
const PUBLICATIONS = `{ publications(first: 10) { nodes { id name } } }`;
const PUBLISH = `
  mutation Publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

// 1. Look up Online Store publication.
console.log('→ Looking up Online Store publication...');
const pubs = await gql(PUBLICATIONS);
const os = pubs.publications.nodes.find((p) => p.name === 'Online Store');
if (!os) { console.error('  ✗ No "Online Store" publication.'); process.exit(1); }
console.log(`  ✓ Online Store: ${os.id}`);

// 2. Upsert the membership product.
console.log(`\n→ Seeding ${spec.handle}...`);
const existing = await gql(PRODUCT_BY_HANDLE, { q: `handle:${spec.handle}` });
const found = existing.products.nodes[0] || null;

const input = {
  handle: spec.handle,
  title: spec.title,
  productType: spec.productType,
  vendor: 'DC Way Soccer',
  status: 'ACTIVE',
  tags: spec.tags,
  descriptionHtml: spec.descriptionHtml,
  productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
  variants: [{
    price: spec.price,
    optionValues: [{ optionName: 'Title', name: 'Default Title' }],
  }],
};
if (found) input.id = found.id;

const res = await gql(PRODUCT_SET, { input });
if (logErrors(`productSet ${spec.handle}`, res.productSet.userErrors)) process.exit(1);
const product = res.productSet.product;
console.log(`  ✓ ${product.id.split('/').pop()} — $${product.variants.nodes[0]?.price}`);

// 3. Set dcway.product_kind = 'membership' so smart-collection rule fires.
const mfRes = await gql(METAFIELDS_SET, {
  metafields: [
    { ownerId: product.id, namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: 'membership' },
  ],
});
logErrors('metafieldsSet', mfRes.metafieldsSet.userErrors);
console.log('  ✓ dcway.product_kind = membership');

// 4. Add to the `membership` collection (smart rule should already catch it, but
//    if the collection is defined as manual this guarantees membership).
const coll = await gql(COLLECTION_BY_HANDLE, { h: 'membership' });
if (coll.collectionByHandle) {
  const r = await gql(COLLECTION_ADD_PRODUCTS, { id: coll.collectionByHandle.id, productIds: [product.id] });
  if (!logErrors('collectionAddProducts', r.collectionAddProducts.userErrors)) {
    console.log(`  ✓ membership collection now: ${r.collectionAddProducts.collection?.productsCount.count} products`);
  }
} else {
  console.log('  · "membership" collection not found — skip (smart rule will pick it up if defined).');
}

// 5. Publish to Online Store.
console.log('\n→ Publishing to Online Store...');
const pr = await gql(PUBLISH, { id: product.id, input: [{ publicationId: os.id }] });
if (logErrors('publish', pr.publishablePublish.userErrors)) process.exit(1);
console.log(`  ✓ ${product.id.split('/').pop()}`);

console.log(`\nDone. Product handle: ${spec.handle}`);
console.log('Next: in page.membership.json, set the featured-product `product` setting to this handle.');
