// Publish all DC Way Soccer products to the Online Store sales channel.
// Liquid `collection.products` is storefront-aware — unpublished products are invisible.

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

// 1. Find the Online Store publication
console.log('→ Looking up Online Store publication...');
let publicationId;
{
  const d = await gql(`{ publications(first: 10) { nodes { id name } } }`);
  for (const p of d.publications.nodes) console.log(`  · ${p.name} → ${p.id}`);
  const onlineStore = d.publications.nodes.find((p) => p.name === 'Online Store');
  if (!onlineStore) {
    console.error('  ✗ No "Online Store" publication found.');
    process.exit(1);
  }
  publicationId = onlineStore.id;
  console.log(`  ✓ Online Store: ${publicationId}`);
}

// 2. List all DC Way Soccer products and their publication status
console.log('\n→ Checking publication status of DC Way Soccer products...');
const productIds = [];
{
  const d = await gql(`{
    products(first: 50, query: "vendor:'DC Way Soccer'") {
      nodes {
        id handle title
        publishedOnPublication(publicationId: "${publicationId}")
      }
    }
  }`);
  for (const p of d.products.nodes) {
    console.log(`  ${p.publishedOnPublication ? '✓' : '✗'} ${p.handle}`);
    if (!p.publishedOnPublication) productIds.push(p.id);
  }
  console.log(`  → ${productIds.length} need publishing`);
}

// 3. Publish each unpublished product
if (productIds.length === 0) {
  console.log('\n✓ All published already.');
  process.exit(0);
}

console.log('\n→ Publishing...');
const PUBLISH = `
  mutation Publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;
for (const pid of productIds) {
  const r = await gql(PUBLISH, { id: pid, input: [{ publicationId }] });
  if (r.publishablePublish.userErrors.length) {
    console.error(`  ✗ ${pid}:`, JSON.stringify(r.publishablePublish.userErrors));
  } else {
    console.log(`  ✓ ${pid}`);
  }
}

console.log('\nDone. Refresh the storefront / theme editor preview.');
