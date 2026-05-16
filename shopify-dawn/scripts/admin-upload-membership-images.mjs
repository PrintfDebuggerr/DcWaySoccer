// Upload Membership-page mockup photo from wordpress-reference/ to Shopify Files,
// then bind the file_reference into templates/page.membership.json.
//
// Uploads:
//   - Membership benefits team-cheer photo → page.membership "plan" section (image-with-text)
//
// Run: node scripts/admin-upload-membership-images.mjs

import { readFileSync, writeFileSync, statSync } from 'node:fs';
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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  x ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '05-membership', 'Membership - DC Way Soccer_files');

const uploads = [
  {
    key: 'benefits_photo',
    file: join(REF, 'capitol-hill-league_06-03-2023-0056.jpg'),
    alias: 'membership-benefits.jpg',
    mime: 'image/jpeg',
    alt: 'DC Way Soccer players celebrating with raised arms at Brentwood Hamilton Park',
  },
];

const STAGED_UPLOADS = `
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
      files {
        id
        fileStatus
        alt
        ... on MediaImage { image { url } }
      }
      userErrors { field message }
    }
  }
`;

const FILE_BY_ID = `
  query($id: ID!) {
    node(id: $id) {
      ... on MediaImage { id fileStatus image { url } }
    }
  }
`;

async function uploadOne(spec) {
  const size = statSync(spec.file).size;
  console.log(`\n-> ${spec.alias} (${(size / 1024).toFixed(0)} KB)`);

  const staged = await gql(STAGED_UPLOADS, {
    input: [{
      filename: spec.alias,
      mimeType: spec.mime,
      httpMethod: 'POST',
      resource: 'IMAGE',
      fileSize: String(size),
    }],
  });
  if (logErrors('stagedUploadsCreate', staged.stagedUploadsCreate.userErrors)) return null;
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  console.log(`  + staged: ${target.resourceUrl.split('?')[0].split('/').slice(-2).join('/')}`);

  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(spec.file)], { type: spec.mime }), spec.alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) {
    console.error(`  x upload PUT ${putRes.status}: ${await putRes.text()}`);
    return null;
  }
  console.log(`  + uploaded to staged URL`);

  const fc = await gql(FILE_CREATE, {
    files: [{
      originalSource: target.resourceUrl,
      contentType: 'IMAGE',
      alt: spec.alt,
    }],
  });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  const file = fc.fileCreate.files[0];
  console.log(`  + registered: ${file.id}`);

  let final = file;
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: file.id });
    final = r.node;
    if (!final) break;
  }
  if (final?.fileStatus !== 'READY') {
    console.error(`  ! status: ${final?.fileStatus} (not READY after polling)`);
  } else {
    console.log(`  + ready: ${final.image.url}`);
  }
  return { id: final.id, url: final?.image?.url || null };
}

const results = {};
for (const spec of uploads) {
  results[spec.key] = await uploadOne(spec);
}

console.log('\n=== Summary ===');
for (const [k, v] of Object.entries(results)) {
  console.log(`${k}: ${v?.id || '(failed)'}`);
}

const tplPath = join(__dirname, '..', 'templates', 'page.membership.json');
const tpl = JSON.parse(readFileSync(tplPath, 'utf8'));

if (results.benefits_photo?.id && tpl.sections.plan) {
  const ref = `shopify://shop_images/${uploads.find((u) => u.key === 'benefits_photo').alias}`;
  tpl.sections.plan.settings.image = ref;
  console.log(`+ bound plan.image -> ${ref}`);
}

writeFileSync(tplPath, JSON.stringify(tpl, null, 2) + '\n');
console.log(`\nUpdated ${tplPath}`);
