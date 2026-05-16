// Bootstrap the "Our Locations" content for /pages/about:
//   1. Use existing `location` metaobject definition.
//   2. Upsert one metaobject per WP location (name, address, city, state, map_url, sort_order).
//
// Run: node scripts/admin-bootstrap-locations.mjs

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  ✗ ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

const gmaps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const LOCATIONS = [
  {
    handle: 'stuart-hobson-middle-school',
    name: 'Stuart-Hobson Middle School',
    address: '410 E St NE',
    city: 'Washington',
    state: 'DC 20002',
    map_url: gmaps('Stuart-Hobson Middle School 410 E St NE Washington DC 20002'),
    position: 1,
  },
  {
    handle: 'hill-center-old-naval-hospital',
    name: 'Hill Center at the Old Naval Hospital',
    address: '921 Pennsylvania Ave SE',
    city: 'Washington',
    state: 'DC 20003',
    map_url: gmaps('Hill Center at the Old Naval Hospital 921 Pennsylvania Ave SE Washington DC 20003'),
    position: 2,
  },
  {
    handle: 'gallaudet-university',
    name: 'Gallaudet University',
    address: '800 Florida Ave NE',
    city: 'Washington',
    state: 'DC 20002',
    map_url: gmaps('Gallaudet University 800 Florida Ave NE Washington DC 20002'),
    position: 3,
  },
  {
    handle: 'shirley-chisholm-elementary',
    name: 'Shirley Chisholm Elementary School',
    address: '1001 G Street SE',
    city: 'Washington',
    state: 'DC 20003',
    map_url: gmaps('Shirley Chisholm Elementary School 1001 G Street SE Washington DC 20003'),
    position: 4,
  },
  {
    handle: 'fields-at-rfk-campus',
    name: 'The Fields at RFK Campus',
    address: '401 Oklahoma Ave NE',
    city: 'Washington',
    state: 'DC 20002',
    map_url: gmaps('The Fields at RFK Campus 401 Oklahoma Ave NE Washington DC 20002'),
    position: 5,
  },
];

const MO_UPSERT = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message code }
    }
  }
`;

console.log('→ Upserting DC Way locations...');
for (const loc of LOCATIONS) {
  console.log(`\n  ${loc.handle}`);
  const r = await gql(MO_UPSERT, {
    handle: { type: 'location', handle: loc.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'name', value: loc.name },
        { key: 'address', value: loc.address },
        { key: 'city', value: loc.city },
        { key: 'state', value: loc.state },
        { key: 'map_url', value: loc.map_url },
        { key: 'sort_order', value: String(loc.position) },
      ],
    },
  });
  if (logErrors(`upsert ${loc.handle}`, r.metaobjectUpsert.userErrors)) continue;
  console.log(`    ✓ metaobject: ${r.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone. Render via shop.metaobjects.location.values, sorted by `sort_order` ascending.');
