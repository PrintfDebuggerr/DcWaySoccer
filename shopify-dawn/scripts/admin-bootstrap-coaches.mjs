// Bootstrap the "Our Coaches" content for /pages/about:
//   1. Create the `coach` metaobject definition (if missing).
//   2. Upload each coach's photo from wordpress-reference/ to Shopify Files.
//   3. Upsert one metaobject per coach with photo, name, role, position.
//
// Run: node scripts/admin-bootstrap-coaches.mjs

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

// Order matches the WP carousel sequence (Maia, Cicero, Kelechi, Celeste, Carina, Benardine, Amalia, Collins).
const COACHES = [
  {
    handle: 'maia-berges-voorhis',
    name: 'Maia Berges Voorhis',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff-0005-1-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 1,
  },
  {
    handle: 'cicero-kilpatrick',
    name: 'Cicero Kilpatrrick',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff-0015-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 2,
  },
  {
    handle: 'kelechi-iwuchukwu',
    name: 'Kelechi Iwuchukwu',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff475-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 3,
  },
  {
    handle: 'celeste-buss',
    name: 'Celeste Buss',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-the-rfk-fields-2-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 4,
  },
  {
    handle: 'carina-vital',
    name: 'Carina Vital',
    role: 'Coach',
    file: join(REF, 'coach-carina-768x796.jpg'),
    mime: 'image/jpeg',
    position: 5,
  },
  {
    handle: 'benardine-iwuchukwu',
    name: 'Benardine C. Iwuchukwu',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff-0009-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 6,
  },
  {
    handle: 'amalia-proper',
    name: 'Amalia Proper',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff-0023-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 7,
  },
  {
    handle: 'collins-iwuchukwu',
    name: 'Collins Iwuchukwu',
    role: 'Coach',
    file: join(REF, 'dc-way-soccer-club-for-kids-in-washington-dc-staff479-768x796.jpeg'),
    mime: 'image/jpeg',
    position: 8,
  },
];

// ───────────── 1. Ensure coach metaobject definition ─────────────
console.log('→ Ensuring coach metaobject definition...');
const DEF_CREATE = `
  mutation Create($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;
const defs = await gql(`{ metaobjectDefinitions(first:50){ nodes{ id type } } }`);
let coachDefId = defs.metaobjectDefinitions.nodes.find((n) => n.type === 'coach')?.id;
if (coachDefId) {
  console.log(`  · already exists: coach → ${coachDefId}`);
} else {
  const r = await gql(DEF_CREATE, {
    definition: {
      name: 'Coach',
      type: 'coach',
      access: { storefront: 'PUBLIC_READ' },
      capabilities: { publishable: { enabled: true } },
      displayNameKey: 'name',
      fieldDefinitions: [
        { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
        { key: 'role', name: 'Role', type: 'single_line_text_field' },
        { key: 'photo', name: 'Photo', type: 'file_reference', validations: [{ name: 'file_type_options', value: '["Image"]' }] },
        { key: 'bio', name: 'Bio', type: 'multi_line_text_field' },
        { key: 'position', name: 'Display order', type: 'number_integer' },
      ],
    },
  });
  if (logErrors('coach def', r.metaobjectDefinitionCreate.userErrors)) process.exit(1);
  coachDefId = r.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`  ✓ created coach → ${coachDefId}`);
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

// ───────────── 3. Metaobject upsert helpers ─────────────
const MO_UPSERT = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message code }
    }
  }
`;

// ───────────── 4. Upload photos + upsert coaches ─────────────
console.log('\n→ Uploading photos + upserting coaches...');
for (const c of COACHES) {
  console.log(`\n  ${c.handle}`);
  const alias = `coach-${c.handle}${c.mime === 'image/png' ? '.png' : '.jpg'}`;
  const photoId = await uploadFile(c.file, alias, c.mime, `${c.name} — ${c.role}`);
  if (!photoId) { console.error(`  ✗ photo upload failed for ${c.handle}`); continue; }
  console.log(`    ✓ photo: ${photoId}`);

  const r = await gql(MO_UPSERT, {
    handle: { type: 'coach', handle: c.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'name', value: c.name },
        { key: 'role', value: c.role },
        { key: 'photo', value: photoId },
        { key: 'sort_order', value: String(c.position) },
      ],
    },
  });
  if (logErrors(`upsert ${c.handle}`, r.metaobjectUpsert.userErrors)) continue;
  console.log(`    ✓ metaobject: ${r.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone. Render via shop.metaobjects.coach.values, sorted by `position` ascending.');
