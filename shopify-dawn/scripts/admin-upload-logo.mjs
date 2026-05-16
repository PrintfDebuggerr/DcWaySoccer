// Upload the WP "Logo-white.png" to Shopify Files and write its CDN URL into
// sections/header-group.json so the header section picks it up automatically.
//
// Run: node scripts/admin-upload-logo.mjs

import { readFileSync, statSync, writeFileSync } from 'node:fs';
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

const LOGO_SOURCE = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '02-about-us', 'About Us - DC Way Soccer_files', 'Logo-white.png');
const HEADER_GROUP = join(__dirname, '..', 'sections', 'header-group.json');

const STAGED = `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;
const FILE_CREATE = `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus ... on MediaImage { image { url } } }
      userErrors { field message }
    }
  }
`;
const FILE_BY_ID = `query($id: ID!) { node(id: $id) { ... on MediaImage { id fileStatus image { url } } } }`;

async function uploadFile(filePath, alias, mime, alt) {
  const size = statSync(filePath).size;
  const staged = await gql(STAGED, {
    input: [{ filename: alias, mimeType: mime, httpMethod: 'POST', resource: 'IMAGE', fileSize: String(size) }],
  });
  if (logErrors('staged', staged.stagedUploadsCreate.userErrors)) return null;
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(filePath)], { type: mime }), alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) { console.error(`  ✗ PUT ${putRes.status}`); return null; }
  const fc = await gql(FILE_CREATE, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt }] });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  let final = fc.fileCreate.files[0];
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: final.id });
    final = r.node;
    if (!final) break;
  }
  return final?.image?.url || null;
}

console.log('→ Uploading DC Way logo...');
const url = await uploadFile(LOGO_SOURCE, 'dcway-logo-white.png', 'image/png', 'DC Way Soccer');
if (!url) { console.error('  ✗ upload failed'); process.exit(1); }
console.log(`  ✓ CDN url: ${url}`);

console.log('\n→ Writing logo_url into sections/header-group.json...');
const json = JSON.parse(readFileSync(HEADER_GROUP, 'utf8'));
json.sections.header.settings.logo_url = url;
writeFileSync(HEADER_GROUP, JSON.stringify(json, null, 2) + '\n', 'utf8');
console.log('  ✓ updated header-group.json');

console.log('\nDone. Header will render the logo on next theme preview.');
