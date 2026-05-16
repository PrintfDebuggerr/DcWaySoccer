// Phase 4B step 6: assign product.camp / product.program alt templates to existing products
// via the templateSuffix field. After this, storefront /products/<handle> uses the matching template.

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

const UPDATE = `
  mutation Update($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle templateSuffix }
      userErrors { field message }
    }
  }
`;

console.log('→ Assigning product templates by metafield kind...');
const d = await gql(`{
  products(first: 50, query: "vendor:'DC Way Soccer'") {
    nodes {
      id handle title templateSuffix
      kind: metafield(namespace: "dcway", key: "product_kind") { value }
    }
  }
}`);

for (const p of d.products.nodes) {
  const kind = p.kind?.value;
  let suffix = null;
  if (kind === 'camp') suffix = 'camp';
  else if (kind === 'program') suffix = 'program';
  // membership: leave default for now (Phase 4B doesn't include it)
  if (!suffix) { console.log(`  · skip ${p.handle} (kind=${kind || 'none'})`); continue; }
  if (p.templateSuffix === suffix) { console.log(`  · ${p.handle} already → product.${suffix}`); continue; }

  const r = await gql(UPDATE, { product: { id: p.id, templateSuffix: suffix } });
  if (r.productUpdate.userErrors.length) {
    console.error(`  ✗ ${p.handle}:`, JSON.stringify(r.productUpdate.userErrors));
  } else {
    console.log(`  ✓ ${p.handle} → product.${suffix}`);
  }
}

console.log('\nDone.');
