// Add a few more test products so Registration grid + Camps grid look populated.
// Idempotent on handle.

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

// Look up the two location metaobject GIDs we created earlier
console.log('→ Looking up location metaobject GIDs...');
const locGids = {};
for (const handle of ['capitol-hill', 'navy-yard']) {
  const d = await gql(
    `query($h:MetaobjectHandleInput!){ metaobjectByHandle(handle:$h){ id handle } }`,
    { h: { type: 'location', handle } }
  );
  if (d.metaobjectByHandle) {
    locGids[handle] = d.metaobjectByHandle.id;
    console.log(`  ✓ ${handle}`);
  }
}

const productSpecs = [
  // ----- Camps -----
  {
    title: 'Art Soccer Summer Camp — Week 2',
    handle: 'art-soccer-summer-camp-week-2',
    productType: 'Camp', tags: ['camp', 'summer', 'half-day'],
    descriptionHtml: '<p>Half-day soccer + art for ages 5–8.</p>',
    metafields: { product_kind: 'camp', season: 'Summer 2026', age_range: '5–8 yrs', date_range_label: 'June 29 – July 3' },
    location: 'capitol-hill', price: '275.00',
  },
  {
    title: 'All-Star Soccer Camp — Week 1',
    handle: 'all-star-soccer-camp-week-1',
    productType: 'Camp', tags: ['camp', 'summer', 'full-day'],
    descriptionHtml: '<p>Full-day intensive camp for ages 9–13. Position-specific training, scrimmages, and tournament-style afternoons.</p>',
    metafields: { product_kind: 'camp', season: 'Summer 2026', age_range: '9–13 yrs', date_range_label: 'July 6 – July 10' },
    location: 'navy-yard', price: '475.00',
  },
  {
    title: 'Goalkeeper Academy — Summer',
    handle: 'goalkeeper-academy-summer',
    productType: 'Camp', tags: ['camp', 'summer', 'specialty'],
    descriptionHtml: '<p>Position-specific keeper training. Diving, distribution, footwork.</p>',
    metafields: { product_kind: 'camp', season: 'Summer 2026', age_range: '10–14 yrs', date_range_label: 'July 13 – July 17' },
    location: 'capitol-hill', price: '395.00',
  },

  // ----- Programs -----
  {
    title: 'Saturday Academy — Spring',
    handle: 'saturday-academy-spring',
    productType: 'Program', tags: ['program', 'academy'],
    descriptionHtml: '<p>10-week training program every Saturday morning. Skill-building + small-sided games.</p>',
    metafields: { product_kind: 'program', season: 'Spring 2026', age_range: '6–10 yrs', date_range_label: 'Mar 14 – May 16' },
    location: 'capitol-hill', price: '395.00',
  },
  {
    title: 'After-School Soccer — Mondays',
    handle: 'after-school-soccer-mondays',
    productType: 'Program', tags: ['program', 'after-school'],
    descriptionHtml: '<p>After-school program. Pickup at participating schools, training at Capitol Hill, drop-off at 6pm.</p>',
    metafields: { product_kind: 'program', season: 'Spring 2026', age_range: '5–11 yrs', date_range_label: 'Mar 9 – May 11' },
    location: 'capitol-hill', price: '525.00',
  },
  {
    title: 'Private Lesson — 30 min',
    handle: 'private-lesson-30',
    productType: 'Program', tags: ['program', 'private-lesson'],
    descriptionHtml: '<p>One-on-one technical session with a senior coach. 30 minutes.</p>',
    metafields: { product_kind: 'program', season: 'Year-round', age_range: 'All ages', date_range_label: 'By appointment' },
    location: 'navy-yard', price: '85.00',
  },

  // ----- Membership -----
  {
    title: 'Annual Member — Family',
    handle: 'annual-member-family',
    productType: 'Membership', tags: ['membership', 'annual'],
    descriptionHtml: '<p>Annual family membership. Discounted camps + programs, priority registration, member-only training nights.</p>',
    metafields: { product_kind: 'membership', season: 'Year-round', age_range: 'All ages', date_range_label: '12-month term' },
    location: 'capitol-hill', price: '450.00',
  },
];

const PRODUCT_CREATE = `
  mutation ProductCreate($product: ProductCreateInput!) {
    productCreate(product: $product) {
      product { id handle title variants(first: 1) { nodes { id } } }
      userErrors { field message }
    }
  }
`;
const VARIANT_BULK_UPDATE = `
  mutation VariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
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

async function findProductByHandle(handle) {
  const d = await gql(
    `query ($q: String!) { products(first: 1, query: $q) { nodes { id handle variants(first: 1) { nodes { id } } } } }`,
    { q: `handle:${handle}` }
  );
  return d.products.nodes[0] || null;
}

console.log('\n→ Seeding products...');
for (const spec of productSpecs) {
  let product = await findProductByHandle(spec.handle);
  if (product) {
    console.log(`  · already exists: ${spec.handle}`);
  } else {
    const data = await gql(PRODUCT_CREATE, {
      product: {
        title: spec.title, handle: spec.handle, productType: spec.productType,
        vendor: 'DC Way Soccer', status: 'ACTIVE',
        tags: spec.tags, descriptionHtml: spec.descriptionHtml,
      },
    });
    if (logErrors(`productCreate ${spec.handle}`, data.productCreate.userErrors)) continue;
    product = data.productCreate.product;
    console.log(`  ✓ ${spec.handle}`);
  }

  // Set price on default variant
  const variantId = product.variants.nodes[0].id;
  const vu = await gql(VARIANT_BULK_UPDATE, {
    productId: product.id,
    variants: [{ id: variantId, price: spec.price }],
  });
  logErrors(`price ${spec.handle}`, vu.productVariantsBulkUpdate.userErrors);

  // Metafields
  const mfInputs = [
    { ownerId: product.id, namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: spec.metafields.product_kind },
    { ownerId: product.id, namespace: 'dcway', key: 'season', type: 'single_line_text_field', value: spec.metafields.season },
    { ownerId: product.id, namespace: 'dcway', key: 'age_range', type: 'single_line_text_field', value: spec.metafields.age_range },
    { ownerId: product.id, namespace: 'dcway', key: 'date_range_label', type: 'single_line_text_field', value: spec.metafields.date_range_label },
  ];
  if (locGids[spec.location]) {
    mfInputs.push({
      ownerId: product.id, namespace: 'dcway', key: 'location',
      type: 'metaobject_reference', value: locGids[spec.location],
    });
  }
  const ms = await gql(METAFIELDS_SET, { metafields: mfInputs });
  logErrors(`metafields ${spec.handle}`, ms.metafieldsSet.userErrors);
}

// Final summary by collection
console.log('\n→ Final collection counts:');
for (const handle of ['camps-summer', 'programs', 'membership', 'programs-after-school', 'programs-private']) {
  const d = await gql(`query($h:String!){ collectionByHandle(handle:$h){ productsCount{ count } } }`, { h: handle });
  console.log(`  ${handle}: ${d.collectionByHandle?.productsCount.count ?? 'N/A'}`);
}

console.log('\nDone.');
