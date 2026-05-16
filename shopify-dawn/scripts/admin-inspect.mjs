// Read-only: inspect what's actually in the store so the next bootstrap matches reality.

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

const ENDPOINT = `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
const gql = async (q, v = {}) => {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query: q, variables: v }),
  });
  return (await r.json()).data;
};

console.log('→ All metaobject definitions and their fields:');
{
  const d = await gql(`{
    metaobjectDefinitions(first: 50) {
      nodes {
        type displayNameKey
        fieldDefinitions { key name type { name } required }
      }
    }
  }`);
  for (const def of d.metaobjectDefinitions.nodes) {
    console.log(`  ${def.type}:`);
    for (const f of def.fieldDefinitions) {
      console.log(`    · ${f.key}  (${f.type.name})${f.required ? ' [required]' : ''}`);
    }
  }
}

console.log('\n→ Product metafield defs (dcway namespace):');
{
  const d = await gql(`{
    metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: "dcway") {
      nodes { key name type { name } useAsCollectionCondition }
    }
  }`);
  for (const f of d.metafieldDefinitions.nodes) {
    console.log(`  · dcway.${f.key}  (${f.type.name})  smartCollectionCondition=${f.useAsCollectionCondition}`);
  }
}

console.log('\n→ camps-summer collection products (re-check):');
{
  const d = await gql(`{
    collectionByHandle(handle: "camps-summer") {
      productsCount { count }
      products(first: 10) { nodes { handle } }
    }
  }`);
  console.log(`  count = ${d.collectionByHandle.productsCount.count}`);
  for (const p of d.collectionByHandle.products.nodes) console.log(`  · ${p.handle}`);
}
