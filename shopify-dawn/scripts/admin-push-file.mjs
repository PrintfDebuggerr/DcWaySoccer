// Push one local theme file to a theme via Admin GraphQL themeFilesUpsert.
// Usage: node scripts/admin-push-file.mjs <relative/theme/path> [themeId]
//   themeId defaults to the MAIN (published) theme.

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

const rel = process.argv[2];
if (!rel) { console.error('Usage: node scripts/admin-push-file.mjs <relative/theme/path> [themeId]'); process.exit(1); }

let themeId = process.argv[3];
if (!themeId) {
  const d = await gql(`{ themes(first:20){ nodes { id role } } }`);
  themeId = d.themes.nodes.find((t) => t.role === 'MAIN').id;
}

const body = readFileSync(join(__dirname, '..', rel), 'utf8');

const MUT = `
  mutation Push($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      upsertedThemeFiles { filename }
      userErrors { field message code }
    }
  }
`;

console.log(`→ Pushing ${rel} to ${themeId} ...`);
const r = await gql(MUT, {
  themeId,
  files: [{ filename: rel, body: { type: 'TEXT', value: body } }],
});
const res = r.themeFilesUpsert;
if (res.userErrors?.length) { console.error('✗', JSON.stringify(res.userErrors, null, 2)); process.exit(1); }
console.log('✓ upserted:', res.upsertedThemeFiles.map((f) => f.filename).join(', '));
