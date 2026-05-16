// Diagnose why card-camp meta line doesn't show location.name.

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
const gql = async (q) => {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query: q }),
  });
  return (await r.json()).data;
};

console.log('→ Check 1: Are products linked to a location metafield?');
{
  const d = await gql(`{
    products(first: 10, query: "vendor:'DC Way Soccer'") {
      nodes {
        handle
        location: metafield(namespace: "dcway", key: "location") {
          type value reference {
            __typename
            ... on Metaobject {
              id handle
              name: field(key: "name") { value }
            }
          }
        }
      }
    }
  }`);
  for (const p of d.products.nodes) {
    const loc = p.location;
    if (!loc) { console.log(`  ✗ ${p.handle} — no metafield`); continue; }
    const ref = loc.reference;
    console.log(`  ${p.handle} → ${loc.value} (${ref?.__typename || 'no ref'} ${ref?.handle || ''} name=${ref?.name?.value || 'BLANK'})`);
  }
}

console.log('\n→ Check 2: Is location metaobject definition storefront-accessible?');
{
  const d = await gql(`{
    metaobjectDefinitions(first: 50) {
      nodes {
        type
        access { storefront }
      }
    }
  }`);
  for (const def of d.metaobjectDefinitions.nodes) {
    console.log(`  ${def.type}: storefront=${def.access.storefront}`);
  }
}
