// Diagnose + fix: metaobject entries default to DRAFT; storefront Liquid only sees ACTIVE.

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

console.log('→ Checking metaobject definition capabilities + entry statuses...');
{
  const d = await gql(`{
    metaobjectDefinitions(first: 50) {
      nodes {
        type
        capabilities { publishable { enabled } }
        metaobjects(first: 20) {
          nodes { handle capabilities { publishable { status } } }
        }
      }
    }
  }`);
  for (const def of d.metaobjectDefinitions.nodes) {
    console.log(`  ${def.type}: publishable.enabled=${def.capabilities.publishable.enabled}`);
    for (const obj of def.metaobjects.nodes) {
      console.log(`    · ${obj.handle} → status=${obj.capabilities?.publishable?.status || 'N/A'}`);
    }
  }
}

console.log('\n→ Looking up location metaobject entries that need ACTIVE...');
const toUpdate = [];
{
  const d = await gql(`{
    metaobjects(type: "location", first: 20) {
      nodes { id handle capabilities { publishable { status } } }
    }
  }`);
  for (const m of d.metaobjects.nodes) {
    const status = m.capabilities?.publishable?.status;
    if (status !== 'ACTIVE') {
      toUpdate.push({ id: m.id, handle: m.handle, current: status });
    }
  }
}

if (toUpdate.length === 0) {
  console.log('  ✓ All location entries already ACTIVE.');
  process.exit(0);
}

console.log(`  ${toUpdate.length} entries to update`);

// Update via metaobjectUpdate, setting capabilities.publishable.status = ACTIVE
const UPDATE = `
  mutation Upd($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject { id handle capabilities { publishable { status } } }
      userErrors { field message code }
    }
  }
`;

console.log('\n→ Updating to ACTIVE...');
for (const m of toUpdate) {
  const r = await gql(UPDATE, {
    id: m.id,
    metaobject: { capabilities: { publishable: { status: 'ACTIVE' } } },
  });
  if (r.metaobjectUpdate.userErrors.length) {
    console.error(`  ✗ ${m.handle}:`, JSON.stringify(r.metaobjectUpdate.userErrors));
  } else {
    console.log(`  ✓ ${m.handle} → ${r.metaobjectUpdate.metaobject.capabilities.publishable.status}`);
  }
}

console.log('\nDone. Refresh storefront.');
