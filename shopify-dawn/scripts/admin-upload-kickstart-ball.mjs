// Upload KICKSTART section decorative soccer-ball illustration (ball.svg)
// from wordpress-reference/ to Shopify Files as a generic file.
//
// Run: node scripts/admin-upload-kickstart-ball.mjs

import { readFileSync, statSync } from 'node:fs';
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

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '01-home-main', 'DC Way Soccer_files');

const uploads = [
  {
    key: 'ball',
    file: join(REF, 'ball.svg'),
    alias: 'dcway-kickstart-ball.svg',
    mime: 'image/svg+xml',
    alt: 'DC Way Soccer ball watermark',
    // SVG goes through FILE resource (not IMAGE) on Shopify Files API
    resource: 'FILE',
    contentType: 'FILE',
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
        ... on GenericFile { url }
      }
      userErrors { field message }
    }
  }
`;

const FILE_BY_ID = `
  query($id: ID!) {
    node(id: $id) {
      ... on GenericFile { id fileStatus url }
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
      resource: spec.resource,
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
    console.error(`  x upload POST ${putRes.status}: ${await putRes.text()}`);
    return null;
  }
  console.log(`  + uploaded to staged URL`);

  const fc = await gql(FILE_CREATE, {
    files: [{
      originalSource: target.resourceUrl,
      contentType: spec.contentType,
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
    console.log(`  + ready: ${final.url}`);
  }
  return { id: final.id, url: final?.url || null };
}

const results = {};
for (const spec of uploads) {
  results[spec.key] = await uploadOne(spec);
}

console.log('\n=== Summary ===');
for (const [k, v] of Object.entries(results)) {
  console.log(`${k}: ${v?.id || '(failed)'}  ${v?.url || ''}`);
}
