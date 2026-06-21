// Extend the gallery_image metaobject for the dedicated Gallery page:
//   1. Add `category` (text) + `video_url` (url) field definitions.
//   2. Categorize the 16 existing image entries by their alt text.
//
// Run: node scripts/admin-extend-gallery.mjs

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

const DEF_ID = 'gid://shopify/MetaobjectDefinition/15476392108';

// ── 1. Add field definitions (idempotent: skip if already present) ──
const defNow = await gql(`{ metaobjectDefinition(id:"${DEF_ID}"){ fieldDefinitions{ key } } }`);
const have = new Set(defNow.metaobjectDefinition.fieldDefinitions.map((f) => f.key));
const toCreate = [];
if (!have.has('category')) toCreate.push({ create: { key: 'category', name: 'Category', type: 'single_line_text_field', description: 'Program/camp this media belongs to (used by the gallery filter).' } });
if (!have.has('video_url')) toCreate.push({ create: { key: 'video_url', name: 'Video URL', type: 'url', description: 'Optional YouTube/Vimeo/MP4 link. If set, the entry shows as a video (photo becomes the poster).' } });

if (toCreate.length) {
  const r = await gql(`
    mutation($id:ID!, $definition:MetaobjectDefinitionUpdateInput!){
      metaobjectDefinitionUpdate(id:$id, definition:$definition){
        metaobjectDefinition{ fieldDefinitions{ key } }
        userErrors{ field message code }
      }
    }`, { id: DEF_ID, definition: { fieldDefinitions: toCreate } });
  const ue = r.metaobjectDefinitionUpdate.userErrors;
  if (ue.length) { console.error('✗ def update:', JSON.stringify(ue, null, 2)); process.exit(1); }
  console.log('✓ fields now:', r.metaobjectDefinitionUpdate.metaobjectDefinition.fieldDefinitions.map((f) => f.key).join(', '));
} else {
  console.log('✓ category + video_url already exist');
}

// ── 2. Categorize existing entries by alt text ──
function categorize(alt) {
  const a = (alt || '').toLowerCase();
  if (/capitol hill/.test(a)) return 'Capitol Hill League';
  if (/goalkeep/.test(a)) return 'Goalkeeping School';
  if (/summer camp/.test(a)) return 'Summer Camp';
  if (/spring break/.test(a)) return 'Spring Break Camp';
  return 'Camps & Programs';
}

const entries = await gql(`{ metaobjects(type:"gallery_image", first:100){ nodes{ id fields{ key value } } } }`);
const nodes = entries.metaobjects.nodes;
console.log(`\n→ Categorizing ${nodes.length} entries...`);

const UPDATE = `
  mutation($id:ID!, $fields:[MetaobjectFieldInput!]!){
    metaobjectUpdate(id:$id, metaobject:{fields:$fields}){ metaobject{ id } userErrors{ field message code } }
  }`;

const tally = {};
for (const n of nodes) {
  const f = Object.fromEntries(n.fields.map((x) => [x.key, x.value]));
  if (f.category) { tally[f.category] = (tally[f.category] || 0) + 1; continue; } // don't overwrite manual edits
  const cat = categorize(f.alt);
  const r = await gql(UPDATE, { id: n.id, fields: [{ key: 'category', value: cat }] });
  const ue = r.metaobjectUpdate.userErrors;
  if (ue.length) { console.error('  ✗', n.id, JSON.stringify(ue)); continue; }
  tally[cat] = (tally[cat] || 0) + 1;
}
console.log('\nCategory counts:', JSON.stringify(tally, null, 2));
console.log('Done.');
