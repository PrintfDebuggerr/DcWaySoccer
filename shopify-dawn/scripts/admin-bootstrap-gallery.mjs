// Bootstrap the "Our Gallery" content for /pages/about:
//   1. Create the `gallery_image` metaobject definition (if missing).
//   2. Upload each photo from wordpress-reference/ to Shopify Files.
//   3. Upsert one metaobject per photo with photo, alt, sort_order.
//
// Run: node scripts/admin-bootstrap-gallery.mjs

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  ✗ ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '02-about-us', 'About Us - DC Way Soccer_files');

// Order matches the WP swiper sequence on /about-us.
const GALLERY = [
  { handle: 'gallery-01', file: 'dcway-07224--2048x1365.jpg',                                                              alt: 'DC Way spring break camp at Chisholm Elementary School', position: 1 },
  { handle: 'gallery-02', file: 'capitol-hill-league_06-03-2023-0056.jpg',                                                 alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 2 },
  { handle: 'gallery-03', file: 'spring-break-04-20-2023-0137-copy-2-2048x1366.jpg',                                       alt: 'DC Way spring break camp at Chisholm Elementary School', position: 3 },
  { handle: 'gallery-04', file: 'dc_way_27.08-0022.jpeg',                                                                  alt: 'DC Way spring break camp at RFK fields', position: 4 },
  { handle: 'gallery-05', file: 'summer-camp-07-2023-0218-scaled.jpg',                                                     alt: 'DC Way spring break camp at Tyler Elementary School', position: 5 },
  { handle: 'gallery-06', file: 'spring-break-04-20-2023-0221.jpeg',                                                       alt: 'DC Way spring break 04-20-2023', position: 6 },
  { handle: 'gallery-07', file: 'dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-the-rfk-fields-0091.jpg',     alt: 'DC Way summer camp at the RFK fields', position: 7 },
  { handle: 'gallery-08', file: 'capitol-hill-and-kids-academy-09-16-2023-0147.jpg',                                       alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 8 },
  { handle: 'gallery-09', file: 'summer-camp-07-2023-0048.jpg',                                                            alt: 'DC Way spring break camp at Tyler Elementary School', position: 9 },
  { handle: 'gallery-10', file: 'capitol-hill-league_06-03-2023-0018.jpg',                                                 alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 10 },
  { handle: 'gallery-11', file: 'dcway-09351-goalkeeping-school.jpg',                                                      alt: 'DC Way goalkeeping school', position: 11 },
  { handle: 'gallery-12', file: 'capitol-hill-league_06-03-2023-0011.jpg',                                                 alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 12 },
  { handle: 'gallery-13', file: 'capitol-hill-league_06-03-2023-0060.jpg',                                                 alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 13 },
  { handle: 'gallery-14', file: 'capitol-hill-league_06-03-2023-0012.jpg',                                                 alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 14 },
  { handle: 'gallery-15', file: 'dsc06820-lauryn-taylor.jpg',                                                              alt: 'DC Way Capitol Hill league at Brentwood Hamilton Park', position: 15 },
  { handle: 'gallery-16', file: 'capitol-hill-league_06-03-2023-0020.jpg',                                                 alt: 'DC Way spring break camp at Chisholm Elementary School', position: 16 },
];

// ───────────── 1. Ensure gallery_image metaobject definition ─────────────
console.log('→ Ensuring gallery_image metaobject definition...');
const DEF_CREATE = `
  mutation Create($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;
const defs = await gql(`{ metaobjectDefinitions(first:50){ nodes{ id type } } }`);
let defId = defs.metaobjectDefinitions.nodes.find((n) => n.type === 'gallery_image')?.id;
if (defId) {
  console.log(`  · already exists: gallery_image → ${defId}`);
} else {
  const r = await gql(DEF_CREATE, {
    definition: {
      name: 'Gallery image',
      type: 'gallery_image',
      access: { storefront: 'PUBLIC_READ' },
      capabilities: { publishable: { enabled: true } },
      displayNameKey: 'alt',
      fieldDefinitions: [
        { key: 'photo', name: 'Photo', type: 'file_reference', required: true, validations: [{ name: 'file_type_options', value: '["Image"]' }] },
        { key: 'alt', name: 'Alt text', type: 'single_line_text_field' },
        { key: 'sort_order', name: 'Display order', type: 'number_integer' },
      ],
    },
  });
  if (logErrors('gallery_image def', r.metaobjectDefinitionCreate.userErrors)) process.exit(1);
  defId = r.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`  ✓ created gallery_image → ${defId}`);
}

// ───────────── 2. File upload helpers ─────────────
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

function mimeFor(name) {
  return /\.(png)$/i.test(name) ? 'image/png' : 'image/jpeg';
}

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
  return final?.id || null;
}

// ───────────── 3. Metaobject upsert ─────────────
const MO_UPSERT = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message code }
    }
  }
`;

// ───────────── 4. Upload photos + upsert metaobjects ─────────────
console.log('\n→ Uploading photos + upserting gallery images...');
for (const g of GALLERY) {
  console.log(`\n  ${g.handle}  (${g.file})`);
  const filePath = join(REF, g.file);
  const mime = mimeFor(g.file);
  const ext = mime === 'image/png' ? '.png' : '.jpg';
  const alias = `gallery-${g.handle}${ext}`;
  const photoId = await uploadFile(filePath, alias, mime, g.alt);
  if (!photoId) { console.error(`  ✗ photo upload failed for ${g.handle}`); continue; }
  console.log(`    ✓ photo: ${photoId}`);

  const r = await gql(MO_UPSERT, {
    handle: { type: 'gallery_image', handle: g.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'photo', value: photoId },
        { key: 'alt', value: g.alt },
        { key: 'sort_order', value: String(g.position) },
      ],
    },
  });
  if (logErrors(`upsert ${g.handle}`, r.metaobjectUpsert.userErrors)) continue;
  console.log(`    ✓ metaobject: ${r.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone. Render via shop.metaobjects.gallery_image.values, sorted by `sort_order` ascending.');
