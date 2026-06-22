// Faz 2 data prep — clean registration data model for the builder:
//   1. Restructure the sample base product to 4 clean "Option" variants (no add-ons baked in).
//   2. Create a "Before/After Care" product (reg-care) with 2 variants.
// Add-ons (t-shirt/ball/shin guards) reuse existing merch products as separate line items.
//
// Run: node scripts/admin-restructure-registration.mjs

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
const ue = (label, arr) => { if (arr && arr.length) { console.error(`  ✗ ${label}:`, JSON.stringify(arr, null, 2)); return true; } return false; };

// ── 1. Restructure base product → 4 clean Option variants ──
const BASE_HANDLE = 'reg-stuart-hobson-week-1-full-week';
const OPTIONS = [
  { name: 'Full Week (9 am-3 pm)', price: '30.00' },
  { name: 'Extended Full Week (9 am-5:30 pm)', price: '45.00' },
  { name: 'First Session (9 am-12 pm)', price: '20.00' },
  { name: 'Second Session (12 pm-3 pm)', price: '20.00' },
];

const base = await gql(`{ productByHandle(handle:"${BASE_HANDLE}"){ id } }`);
if (!base.productByHandle) { console.error(`Base product ${BASE_HANDLE} not found`); process.exit(1); }
const baseId = base.productByHandle.id;

console.log('→ Restructuring base product to clean Option variants...');
const set = await gql(`
  mutation($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product { id options { name optionValues { name } } variants(first:10){ nodes { title price } } }
      userErrors { field message code }
    }
  }`, {
  input: {
    id: baseId,
    productOptions: [{ name: 'Option', values: OPTIONS.map((o) => ({ name: o.name })) }],
    variants: OPTIONS.map((o) => ({
      optionValues: [{ optionName: 'Option', name: o.name }],
      price: o.price,
      inventoryPolicy: 'CONTINUE',
    })),
  },
});
if (ue('productSet base', set.productSet.userErrors)) process.exit(1);
console.log('  ✓ base variants:', set.productSet.product.variants.nodes.map((v) => v.title + ' $' + v.price).join(', '));

// ── 2. Create Before/After Care product ──
console.log('\n→ Upserting Care product (reg-care)...');
const careExisting = await gql(`{ productByHandle(handle:"reg-care"){ id } }`);
let careId = careExisting.productByHandle && careExisting.productByHandle.id;

const careInput = {
  title: 'Camp Before / After Care',
  handle: 'reg-care',
  status: 'ACTIVE',
  productType: 'Registration Add-on',
  vendor: 'DC Way Soccer',
  tags: ['reg', 'reg-addon', 'reg-addon-care'],
  productOptions: [{ name: 'Care', values: [{ name: 'Before Care (8-9 am)' }, { name: 'After Care (3-5:30 pm)' }] }],
  variants: [
    { optionValues: [{ optionName: 'Care', name: 'Before Care (8-9 am)' }], price: '10.00', inventoryPolicy: 'CONTINUE' },
    { optionValues: [{ optionName: 'Care', name: 'After Care (3-5:30 pm)' }], price: '15.00', inventoryPolicy: 'CONTINUE' },
  ],
};
if (careId) careInput.id = careId;

const careSet = await gql(`
  mutation($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product { id handle variants(first:5){ nodes { id title price } } }
      userErrors { field message code }
    }
  }`, { input: careInput });
if (ue('productSet care', careSet.productSet.userErrors)) process.exit(1);
console.log('  ✓ care:', careSet.productSet.product.handle, careSet.productSet.product.variants.nodes.map((v) => v.title + ' $' + v.price).join(', '));

// Publish care to Online Store
const pubs = await gql(`{ publications(first:10){ nodes { id name } } }`);
const onlineStore = pubs.publications.nodes.find((p) => p.name === 'Online Store');
if (onlineStore) {
  const pub = await gql(`
    mutation($id:ID!, $pubId:ID!){ publishablePublish(id:$id, input:{publicationId:$pubId}){ userErrors{ field message } } }`,
    { id: careSet.productSet.product.id, pubId: onlineStore.id });
  ue('publish care', pub.publishablePublish.userErrors);
}

console.log('\nDone. Base = 4 Option variants; reg-care = 2 Care variants. Add-ons reuse merch products.');
