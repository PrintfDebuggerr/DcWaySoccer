// Check publication status via product.onlineStoreUrl (no scope required).

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
  return (await r.json()).data;
};

const d = await gql(`{
  products(first: 50, query: "vendor:'DC Way Soccer'") {
    nodes { handle status onlineStoreUrl publishedAt }
  }
}`);

console.log('handle | status | onlineStoreUrl | publishedAt');
console.log('-'.repeat(80));
for (const p of d.products.nodes) {
  console.log(`${p.handle} | ${p.status} | ${p.onlineStoreUrl ? 'YES' : 'NO'} | ${p.publishedAt || 'never'}`);
}
