// Seed sample merch products so /collections/merch renders with real cards
// and we can visually verify the Phase 5 side-label band + orange price treatment.
//
// Creates 3 products with productType set (so the data-product-type CSS hook fires):
//   - DC Way Youth Panna T-Shirt   (T-Shirts, Color × Size, $25)
//   - DC Way Custom Ball           (Balls, Size, $40)
//   - DC Way Shin Guards           (Shin Guards, Size, $10)
//
// For each: productSet → set dcway.product_kind=merch → add to `merch` manual
// collection → publish to Online Store. Idempotent on handle.
//
// Run: node scripts/admin-seed-merch.mjs

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

// ----- Product specs -----
// `optionValues` order matters: the cartesian product is generated in the same
// order so each variant lines up with `priceMatrix` by index.
const products = [
  {
    handle: 'dc-way-youth-panna-tshirt',
    title: 'DC Way Youth Panna T-Shirt',
    productType: 'T-Shirts',
    tags: ['merch', 'apparel', 't-shirt'],
    descriptionHtml: '<p>Lightweight youth performance tee. Wear it to camp, wear it to school, wear it to bed.</p>',
    options: [
      { name: 'Color', values: ['Black', 'Navy', 'Green', 'Red', 'Gray'] },
      { name: 'Size', values: ['XS', 'S', 'M', 'L', 'XL'] },
    ],
    price: '25.00',
  },
  {
    handle: 'dc-way-custom-ball',
    title: 'DC Way Custom Ball',
    productType: 'Balls',
    tags: ['merch', 'equipment', 'ball'],
    descriptionHtml: '<p>Official DC Way size-graded match ball. Hand-stitched, training-grade durability.</p>',
    options: [
      { name: 'Size', values: ['Size 3', 'Size 4', 'Size 5'] },
    ],
    price: '40.00',
  },
  {
    handle: 'dc-way-shin-guards',
    title: 'DC Way Shin Guards',
    productType: 'Shin Guards',
    tags: ['merch', 'equipment', 'shin-guards'],
    descriptionHtml: '<p>Lightweight molded shin guards with strap closure. Required gear for all camps + leagues.</p>',
    options: [
      { name: 'Size', values: ['Small', 'Medium', 'Large'] },
    ],
    price: '10.00',
  },
];

// ----- Queries / mutations -----
const PRODUCT_BY_HANDLE = `
  query($q: String!) {
    products(first: 1, query: $q) {
      nodes { id handle title }
    }
  }
`;

const PRODUCT_SET = `
  mutation ProductSet($input: ProductSetInput!) {
    productSet(input: $input, synchronous: true) {
      product { id handle title variants(first: 100) { nodes { id title } } }
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
  query($h: String!) {
    collectionByHandle(handle: $h) { id handle title }
  }
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
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

// ----- Helpers -----
function cartesian(arrays) {
  return arrays.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );
}

async function findProductByHandle(handle) {
  const d = await gql(PRODUCT_BY_HANDLE, { q: `handle:${handle}` });
  return d.products.nodes[0] || null;
}

// ----- 1. Look up the Online Store publication + merch collection -----
console.log('→ Looking up publications + merch collection...');
let publicationId;
{
  const d = await gql(PUBLICATIONS);
  const os = d.publications.nodes.find((p) => p.name === 'Online Store');
  if (!os) { console.error('  ✗ No "Online Store" publication.'); process.exit(1); }
  publicationId = os.id;
  console.log(`  ✓ Online Store: ${publicationId}`);
}
let merchCollectionId;
{
  const d = await gql(COLLECTION_BY_HANDLE, { h: 'merch' });
  if (!d.collectionByHandle) {
    console.error('  ✗ Collection with handle "merch" not found. Run admin-bootstrap-collections.mjs first.');
    process.exit(1);
  }
  merchCollectionId = d.collectionByHandle.id;
  console.log(`  ✓ merch collection: ${merchCollectionId}`);
}

// ----- 2. Create / upsert each product -----
console.log('\n→ Seeding merch products...');
const createdIds = [];
for (const spec of products) {
  const variantCombos = cartesian(spec.options.map((o) => o.values));
  console.log(`\n  ${spec.handle} — ${variantCombos.length} variants`);

  let product = await findProductByHandle(spec.handle);

  const input = {
    handle: spec.handle,
    title: spec.title,
    productType: spec.productType,
    vendor: 'DC Way Soccer',
    status: 'ACTIVE',
    tags: spec.tags,
    descriptionHtml: spec.descriptionHtml,
    productOptions: spec.options.map((o) => ({
      name: o.name,
      values: o.values.map((v) => ({ name: v })),
    })),
    variants: variantCombos.map((combo) => ({
      price: spec.price,
      optionValues: combo.map((v, i) => ({ optionName: spec.options[i].name, name: v })),
    })),
  };
  if (product) input.id = product.id;

  const res = await gql(PRODUCT_SET, { input });
  if (logErrors(`productSet ${spec.handle}`, res.productSet.userErrors)) continue;
  product = res.productSet.product;
  console.log(`    ✓ ${product ? (product.id.split('/').pop()) : '?'} (${product.variants.nodes.length} variants)`);

  createdIds.push(product.id);

  // dcway.product_kind = 'merch' so smart-collection rules also pick it up later.
  const mfRes = await gql(METAFIELDS_SET, {
    metafields: [
      { ownerId: product.id, namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: 'merch' },
    ],
  });
  logErrors(`metafields ${spec.handle}`, mfRes.metafieldsSet.userErrors);
}

// ----- 3. Add all to the `merch` manual collection (idempotent — Shopify dedupes) -----
if (createdIds.length) {
  console.log('\n→ Adding to merch collection...');
  const r = await gql(COLLECTION_ADD_PRODUCTS, { id: merchCollectionId, productIds: createdIds });
  logErrors('collectionAddProducts', r.collectionAddProducts.userErrors);
  console.log(`  ✓ merch now holds ${r.collectionAddProducts.collection?.productsCount.count} products`);
}

// ----- 4. Publish to Online Store -----
console.log('\n→ Publishing to Online Store...');
for (const pid of createdIds) {
  const r = await gql(PUBLISH, { id: pid, input: [{ publicationId }] });
  if (r.publishablePublish.userErrors.length) {
    console.error(`  ✗ ${pid}:`, JSON.stringify(r.publishablePublish.userErrors));
  } else {
    console.log(`  ✓ ${pid.split('/').pop()}`);
  }
}

console.log('\nDone. Visit /collections/merch on the storefront — each card should show the rotated orange side-label band reading T-Shirts / Balls / Shin Guards.');
