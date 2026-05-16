// One-shot bootstrap: creates dcway.* product metafield definitions and 2 test camp products.
// Reads admin token from ../.env (gitignored). Idempotent — re-running re-uses existing definitions/products.
//
// Usage: node scripts/admin-bootstrap.mjs

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

const STORE = env.SHOPIFY_STORE;
const VERSION = env.SHOPIFY_API_VERSION;
const TOKEN = env.SHOPIFY_ADMIN_TOKEN;
const ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    throw new Error('GraphQL errors: ' + JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

function logErrors(label, userErrors) {
  if (userErrors && userErrors.length) {
    console.error(`  ✗ ${label} userErrors:`, JSON.stringify(userErrors, null, 2));
    return true;
  }
  return false;
}

// 1. Sanity check: shop name
console.log('→ Verifying token...');
{
  const data = await gql(`{ shop { name primaryDomain { url } } }`);
  console.log(`  ✓ Connected to: ${data.shop.name} (${data.shop.primaryDomain.url})`);
}

// 2. Look up location metaobject definition (needed for the dcway.location field validation)
console.log('→ Looking up metaobject definitions...');
const metaobjectDefs = {};
{
  const data = await gql(`{
    metaobjectDefinitions(first: 50) {
      nodes { id type name }
    }
  }`);
  for (const def of data.metaobjectDefinitions.nodes) {
    metaobjectDefs[def.type] = def.id;
    console.log(`  ✓ ${def.type} → ${def.id}`);
  }
}

if (!metaobjectDefs.location) {
  console.error('  ✗ No "location" metaobject definition found. Create it in admin first.');
  process.exit(1);
}

// 3. Define the metafield definitions to create
const definitions = [
  {
    name: 'Product kind',
    namespace: 'dcway',
    key: 'product_kind',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    useAsCollectionCondition: true,
    validations: [{ name: 'choices', value: JSON.stringify(['camp', 'program', 'membership']) }],
  },
  {
    name: 'Age range',
    namespace: 'dcway',
    key: 'age_range',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
  },
  {
    name: 'Season',
    namespace: 'dcway',
    key: 'season',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    useAsCollectionCondition: true,
  },
  {
    name: 'Location',
    namespace: 'dcway',
    key: 'location',
    type: 'metaobject_reference',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    validations: [{ name: 'metaobject_definition_id', value: metaobjectDefs.location }],
  },
  {
    name: 'Date range label',
    namespace: 'dcway',
    key: 'date_range_label',
    type: 'single_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
  },
];

// Phase 4B fields — included for completeness; safe to skip if metaobject defs missing.
if (metaobjectDefs.camp_week) {
  definitions.push({
    name: 'Weeks',
    namespace: 'dcway',
    key: 'weeks',
    type: 'list.metaobject_reference',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    validations: [{ name: 'metaobject_definition_id', value: metaobjectDefs.camp_week }],
  });
}
if (metaobjectDefs.schedule_row) {
  definitions.push({
    name: 'Daily schedule',
    namespace: 'dcway',
    key: 'daily_schedule',
    type: 'list.metaobject_reference',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    validations: [{ name: 'metaobject_definition_id', value: metaobjectDefs.schedule_row }],
  });
}
definitions.push(
  {
    name: 'FAQ',
    namespace: 'dcway',
    key: 'faq',
    type: 'multi_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
  },
  {
    name: 'Includes bullets',
    namespace: 'dcway',
    key: 'includes_bullets',
    type: 'multi_line_text_field',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
  },
  {
    name: 'Featured image (secondary)',
    namespace: 'dcway',
    key: 'featured_image_secondary',
    type: 'file_reference',
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
    validations: [{ name: 'file_type_options', value: '["Image"]' }],
  }
);

// 4. Create each definition (idempotent — TAKEN code is treated as success)
console.log('→ Creating product metafield definitions...');
const CREATE_DEF = `
  mutation Create($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id namespace key name }
      userErrors { field message code }
    }
  }
`;
for (const def of definitions) {
  const data = await gql(CREATE_DEF, { definition: def });
  const r = data.metafieldDefinitionCreate;
  if (r.createdDefinition) {
    console.log(`  ✓ created ${def.namespace}.${def.key}`);
  } else {
    const taken = r.userErrors.find((e) => e.code === 'TAKEN');
    if (taken) {
      console.log(`  · already exists: ${def.namespace}.${def.key}`);
    } else {
      logErrors(`${def.namespace}.${def.key}`, r.userErrors);
    }
  }
}

// 5. Look up first location metaobject (to assign to test products)
console.log('→ Fetching first location metaobject entry...');
let firstLocationGid = null;
{
  const data = await gql(`{
    metaobjects(type: "location", first: 5) {
      nodes { id handle displayName }
    }
  }`);
  if (data.metaobjects.nodes.length === 0) {
    console.warn('  ! No location entries found — test products will not have a location set.');
  } else {
    firstLocationGid = data.metaobjects.nodes[0].id;
    console.log(`  ✓ ${data.metaobjects.nodes[0].displayName} → ${firstLocationGid}`);
  }
}

// 6. Create 2 test camp products (idempotent on handle)
console.log('→ Creating test camp products...');
const productSpecs = [
  {
    title: 'Art Soccer Summer Camp — Week 1',
    handle: 'art-soccer-summer-camp-week-1',
    productType: 'Camp',
    tags: ['camp', 'summer', 'half-day'],
    descriptionHtml:
      '<p>Half-day soccer-meets-art camp for ages 5–8. Mornings of soccer skills and games, afternoons of art projects inspired by the day’s session.</p>',
    metafields: {
      product_kind: 'camp',
      season: 'Summer 2026',
      age_range: '5–8 yrs',
      date_range_label: 'June 22 – June 26',
    },
    price: '275.00',
  },
  {
    title: 'Skills Clinic — Wednesdays',
    handle: 'skills-clinic-wednesdays',
    productType: 'Program',
    tags: ['program', 'clinic'],
    descriptionHtml:
      '<p>Drop-in skills clinic every Wednesday evening. Six-week block focused on dribbling, first touch, and 1v1 attacking moves.</p>',
    metafields: {
      product_kind: 'program',
      season: 'Spring 2026',
      age_range: '9–12 yrs',
      date_range_label: 'Apr 8 – May 13',
    },
    price: '180.00',
  },
];

async function findProductByHandle(handle) {
  const data = await gql(
    `query ($q: String!) { products(first: 1, query: $q) { nodes { id handle title variants(first: 1) { nodes { id } } } } }`,
    { q: `handle:${handle}` }
  );
  return data.products.nodes[0] || null;
}

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
      metafields { id namespace key value }
      userErrors { field message }
    }
  }
`;

for (const spec of productSpecs) {
  let product = await findProductByHandle(spec.handle);
  if (product) {
    console.log(`  · already exists: ${spec.handle} (${product.id})`);
  } else {
    const data = await gql(PRODUCT_CREATE, {
      product: {
        title: spec.title,
        handle: spec.handle,
        productType: spec.productType,
        vendor: 'DC Way Soccer',
        status: 'ACTIVE',
        tags: spec.tags,
        descriptionHtml: spec.descriptionHtml,
      },
    });
    if (logErrors(`productCreate ${spec.handle}`, data.productCreate.userErrors)) continue;
    product = data.productCreate.product;
    console.log(`  ✓ created ${spec.handle} (${product.id})`);
  }

  // Set price on the auto-created default variant
  const variantId = product.variants.nodes[0].id;
  const vu = await gql(VARIANT_BULK_UPDATE, {
    productId: product.id,
    variants: [{ id: variantId, price: spec.price }],
  });
  logErrors(`variant price ${spec.handle}`, vu.productVariantsBulkUpdate.userErrors);

  // Build metafield set
  const mfInputs = [
    { ownerId: product.id, namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: spec.metafields.product_kind },
    { ownerId: product.id, namespace: 'dcway', key: 'season', type: 'single_line_text_field', value: spec.metafields.season },
    { ownerId: product.id, namespace: 'dcway', key: 'age_range', type: 'single_line_text_field', value: spec.metafields.age_range },
    { ownerId: product.id, namespace: 'dcway', key: 'date_range_label', type: 'single_line_text_field', value: spec.metafields.date_range_label },
  ];
  if (firstLocationGid) {
    mfInputs.push({
      ownerId: product.id,
      namespace: 'dcway',
      key: 'location',
      type: 'metaobject_reference',
      value: firstLocationGid,
    });
  }
  const ms = await gql(METAFIELDS_SET, { metafields: mfInputs });
  if (!logErrors(`metafieldsSet ${spec.handle}`, ms.metafieldsSet.userErrors)) {
    console.log(`    metafields set: ${ms.metafieldsSet.metafields.length}`);
  }
}

console.log('\nDone.');
