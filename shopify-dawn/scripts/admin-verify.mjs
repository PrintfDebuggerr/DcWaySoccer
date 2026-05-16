// Verify Phase 4A bootstrap: products show up in collections, metafields read back via storefront-visible namespace.

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

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()).data;
}

console.log('→ Test products + metafields:');
{
  const data = await gql(`{
    products(first: 5, query: "vendor:'DC Way Soccer'") {
      nodes {
        handle title status
        priceRangeV2 { minVariantPrice { amount currencyCode } }
        metafields(first: 20, namespace: "dcway") {
          nodes { key value type }
        }
      }
    }
  }`);
  for (const p of data.products.nodes) {
    console.log(`  ${p.handle} [${p.status}]  ${p.priceRangeV2.minVariantPrice.amount} ${p.priceRangeV2.minVariantPrice.currencyCode}`);
    for (const m of p.metafields.nodes) {
      console.log(`    · dcway.${m.key} = ${m.value}`);
    }
  }
}

console.log('\n→ Collections matching test products:');
{
  const data = await gql(`{
    collections(first: 20) {
      nodes {
        handle title productsCount { count }
      }
    }
  }`);
  for (const c of data.collections.nodes) {
    console.log(`  ${c.handle}  → ${c.productsCount.count} products`);
  }
}

console.log('\n→ Camps-summer membership detail:');
{
  const data = await gql(`{
    collectionByHandle(handle: "camps-summer") {
      title
      ruleSet { rules { column condition } }
      products(first: 10) { nodes { handle title } }
    }
  }`);
  if (!data.collectionByHandle) {
    console.log('  ! no collection with handle camps-summer');
  } else {
    console.log('  rules:', JSON.stringify(data.collectionByHandle.ruleSet?.rules ?? null));
    for (const p of data.collectionByHandle.products.nodes) {
      console.log(`  · ${p.handle}`);
    }
  }
}
