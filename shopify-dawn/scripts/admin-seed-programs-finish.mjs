// Finishing step for admin-seed-programs.mjs:
// 1. Set `dcway.product_kind = 'program'` on the 15 new products (brings them into the smart collection).
// 2. Delete that metafield on 4 old placeholders (removes them from the smart collection).
// 3. Switch the `programs` collection sortOrder to MANUAL, then reorder to WP display order.

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  X ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

// Order matches WP display: page 1 (9) then page 2 (6)
const WP_ORDER = [
  'kids-academy', 'challenge-level', 'adult-skills-clinics',
  'after-school-program-at-sherwood-rec', 'capitol-hill-spring-league', 'weekly-skills-clinics',
  'goalkeeping-school', 'seaton-after-school-program', 'private-lessons',
  'soccer-birthday-party', 'two-rivers-after-school', 'youth-leadership-programs',
  'dc-way-rising-stars', 'counselor-in-training', 'junior-assistant',
];

const PLACEHOLDERS = [
  'skills-clinic-wednesdays', 'saturday-academy-spring',
  'after-school-soccer-mondays', 'private-lesson-30',
];

const METAFIELDS_SET = `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key namespace }
      userErrors { field message }
    }
  }
`;
const METAFIELDS_DELETE = `
  mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
    metafieldsDelete(metafields: $metafields) {
      deletedMetafields { ownerId key namespace }
      userErrors { field message }
    }
  }
`;
const COLLECTION_UPDATE = `
  mutation CollectionUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id sortOrder }
      userErrors { field message }
    }
  }
`;
const COLLECTION_REORDER = `
  mutation CollectionReorder($id: ID!, $moves: [MoveInput!]!) {
    collectionReorderProducts(id: $id, moves: $moves) {
      job { id done }
      userErrors { field message }
    }
  }
`;

async function findProductByHandle(handle) {
  const d = await gql(
    `query ($q: String!) { products(first: 1, query: $q) { nodes { id handle title } } }`,
    { q: `handle:${handle}` }
  );
  return d.products.nodes[0] || null;
}

// 1. Set metafield on 15 new products
console.log('-> Setting dcway.product_kind = "program" on 15 new products...');
const idsByHandle = {};
for (const handle of WP_ORDER) {
  const p = await findProductByHandle(handle);
  if (!p) { console.warn(`  ! missing: ${handle}`); continue; }
  idsByHandle[handle] = p.id;
  const r = await gql(METAFIELDS_SET, {
    metafields: [{ ownerId: p.id, namespace: 'dcway', key: 'product_kind', type: 'single_line_text_field', value: 'program' }],
  });
  if (!logErrors(handle, r.metafieldsSet.userErrors)) console.log(`  ok ${handle}`);
}

// 2. Delete that metafield on 4 placeholders so they leave the smart collection
console.log('\n-> Removing dcway.product_kind from 4 placeholders...');
const placeholderIds = [];
for (const handle of PLACEHOLDERS) {
  const p = await findProductByHandle(handle);
  if (!p) { console.warn(`  ! missing: ${handle}`); continue; }
  placeholderIds.push(p.id);
}
if (placeholderIds.length > 0) {
  const r = await gql(METAFIELDS_DELETE, {
    metafields: placeholderIds.map((id) => ({ ownerId: id, namespace: 'dcway', key: 'product_kind' })),
  });
  if (!logErrors('placeholders', r.metafieldsDelete.userErrors)) {
    console.log(`  removed metafield on ${r.metafieldsDelete.deletedMetafields.length} placeholders`);
  }
}

// 3. Switch collection sort to MANUAL
console.log('\n-> Setting programs collection sort to MANUAL...');
const collectionId = 'gid://shopify/Collection/331009949868';
const cu = await gql(COLLECTION_UPDATE, { input: { id: collectionId, sortOrder: 'MANUAL' } });
if (!logErrors('collectionUpdate', cu.collectionUpdate.userErrors)) {
  console.log(`  sortOrder: ${cu.collectionUpdate.collection.sortOrder}`);
}

// Wait a moment for the smart-collection sync to pick up the new products
console.log('\n-> Waiting 3s for smart collection to pick up new members...');
await new Promise((r) => setTimeout(r, 3000));

// 4. Reorder to WP display order
console.log('-> Reordering to WP display order...');
const moves = WP_ORDER.map((h, idx) => ({ id: idsByHandle[h], newPosition: String(idx) })).filter((m) => m.id);
const r2 = await gql(COLLECTION_REORDER, { id: collectionId, moves });
if (!logErrors('reorder', r2.collectionReorderProducts.userErrors)) {
  console.log(`  job: ${r2.collectionReorderProducts.job?.id} done=${r2.collectionReorderProducts.job?.done}`);
}

console.log('\n-> Done. Open the storefront /pages/Programs to verify.');
