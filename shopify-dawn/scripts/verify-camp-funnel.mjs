// One-shot funnel verifier: confirms camp products are on product.camp template,
// variants exist, and all metafields the camp-* sections read are populated.
// Read-only — no mutations.

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

const Q = `{
  products(first: 50, query: "metafields.dcway.product_kind:camp") {
    nodes {
      handle title status templateSuffix onlineStoreUrl
      variants(first: 50) {
        nodes { id title price availableForSale inventoryQuantity }
      }
      includes:        metafield(namespace: "dcway", key: "includes_bullets") { value type }
      faq:             metafield(namespace: "dcway", key: "faq") { value type }
      weeks:           metafield(namespace: "dcway", key: "weeks") {
        value type
        references(first: 20) {
          nodes {
            ... on Metaobject {
              id type handle
              fields { key value }
            }
          }
        }
      }
      daily:           metafield(namespace: "dcway", key: "daily_schedule") {
        value type
        references(first: 20) {
          nodes {
            ... on Metaobject {
              id type handle
              fields { key value }
            }
          }
        }
      }
    }
  }
  metaobjectDefinitions(first: 50) {
    nodes { type name fieldDefinitions { key name type { name } } }
  }
}`;

const d = await gql(Q);

console.log('=== Metaobject definitions present ===');
const defs = d.metaobjectDefinitions.nodes;
for (const def of defs) {
  if (['camp_week', 'schedule_row', 'location'].includes(def.type)) {
    const fields = def.fieldDefinitions.map((f) => `${f.key}:${f.type.name}`).join(', ');
    console.log(`  ${def.type.padEnd(14)} (${def.name})  →  [${fields}]`);
  }
}
const haveCampWeek = defs.some((d) => d.type === 'camp_week');
const haveScheduleRow = defs.some((d) => d.type === 'schedule_row');
console.log(`  camp_week defined:    ${haveCampWeek ? 'YES' : 'NO'}`);
console.log(`  schedule_row defined: ${haveScheduleRow ? 'YES' : 'NO'}`);

console.log('\n=== Camp products ===');
for (const p of d.products.nodes) {
  const tmpl = p.templateSuffix ? `product.${p.templateSuffix}` : 'product (default)';
  const tmplOK = p.templateSuffix === 'camp' ? '✓' : '✗';
  console.log(`\n[${p.handle}]  status=${p.status}  template=${tmpl} ${tmplOK}`);
  console.log(`  url: ${p.onlineStoreUrl || '(not published)'}`);
  console.log(`  variants (${p.variants.nodes.length}):`);
  for (const v of p.variants.nodes) {
    const inv = v.inventoryQuantity === null ? 'untracked' : `inv:${v.inventoryQuantity}`;
    console.log(`    · "${v.title}" $${v.price}  avail=${v.availableForSale}  ${inv}`);
  }
  console.log(`  metafields:`);
  const fields = [
    ['includes_bullets', p.includes],
    ['faq', p.faq],
    ['weeks', p.weeks],
    ['daily_schedule', p.daily],
  ];
  for (const [k, mf] of fields) {
    if (!mf) {
      console.log(`    ✗ dcway.${k}  — MISSING`);
      continue;
    }
    if (mf.references) {
      const refs = mf.references.nodes;
      console.log(`    ${refs.length > 0 ? '✓' : '✗'} dcway.${k}  (${mf.type})  → ${refs.length} reference(s)`);
      for (const r of refs.slice(0, 3)) {
        const summary = r.fields.slice(0, 3).map((f) => `${f.key}=${(f.value || '').slice(0, 30)}`).join(' | ');
        console.log(`        - ${r.type}/${r.handle}: ${summary}`);
      }
    } else {
      const preview = (mf.value || '').replace(/\s+/g, ' ').slice(0, 80);
      console.log(`    ${preview ? '✓' : '✗'} dcway.${k}  (${mf.type})  "${preview}${(mf.value||'').length > 80 ? '…' : ''}"`);
    }
  }
}
