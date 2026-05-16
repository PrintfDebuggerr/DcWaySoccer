// Upload About-page mockup photos from wordpress-reference/ to Shopify Files,
// then bind their file_reference IDs into templates/page.about.json.
//
// Uploads:
//   - photo banner  → about-photo-banner section
//   - mission/vision main photo → about-mission-vision section
//
// Run: node scripts/admin-upload-about-images.mjs

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

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

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '02-about-us', 'About Us - DC Way Soccer_files');

// Upload spec: choose 2 well-cropped photos as mockups.
const uploads = [
  {
    key: 'photo_banner',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-the-rfk-fields-0091.jpg'),
    alias: 'about-photo-banner.jpg',
    mime: 'image/jpeg',
    alt: 'DC Way Soccer group at the RFK Fields',
  },
  {
    key: 'mission_photo',
    file: join(REF, 'summer-camp-07-2023-0190-1-copy-930x1200.jpg'),
    alias: 'about-mission-photo.jpg',
    mime: 'image/jpeg',
    alt: 'DC Way Soccer summer camp kids',
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
  console.log(`\n→ ${spec.alias} (${(size / 1024).toFixed(0)} KB)`);

  // 1. Get a presigned upload target.
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
  console.log(`  ✓ staged: ${target.resourceUrl.split('?')[0].split('/').slice(-2).join('/')}`);

  // 2. POST the file to the presigned URL with all returned params.
  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(spec.file)], { type: spec.mime }), spec.alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) {
    console.error(`  ✗ upload PUT ${putRes.status}: ${await putRes.text()}`);
    return null;
  }
  console.log(`  ✓ uploaded to staged URL`);

  // 3. Register the file in Shopify Files.
  const fc = await gql(FILE_CREATE, {
    files: [{
      originalSource: target.resourceUrl,
      contentType: 'IMAGE',
      alt: spec.alt,
    }],
  });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  const file = fc.fileCreate.files[0];
  console.log(`  ✓ registered: ${file.id}`);

  // 4. Poll until status is READY (CDN URL becomes available).
  let final = file;
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: file.id });
    final = r.node;
    if (!final) break;
  }
  if (final?.fileStatus !== 'READY') {
    console.error(`  ⚠ status: ${final?.fileStatus} (not READY after polling)`);
  } else {
    console.log(`  ✓ ready: ${final.image.url}`);
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

// Bind into page.about.json.
const tplPath = join(__dirname, '..', 'templates', 'page.about.json');
const tpl = JSON.parse(readFileSync(tplPath, 'utf8'));

// image_picker JSON values must use the `shopify://shop_images/{filename}` format,
// not the file GID. Convert each upload's alias filename here.
if (results.photo_banner?.id && tpl.sections.photo_banner) {
  const ref = `shopify://shop_images/${uploads.find((u) => u.key === 'photo_banner').alias}`;
  tpl.sections.photo_banner.settings.image = ref;
  console.log(`✓ bound photo_banner → ${ref}`);
}
if (results.mission_photo?.id && tpl.sections.mission_vision) {
  const ref = `shopify://shop_images/${uploads.find((u) => u.key === 'mission_photo').alias}`;
  tpl.sections.mission_vision.settings.main_image = ref;
  console.log(`✓ bound mission_vision.main_image → ${ref}`);
}

writeFileSync(tplPath, JSON.stringify(tpl, null, 2) + '\n');
console.log(`\nUpdated ${tplPath}`);
