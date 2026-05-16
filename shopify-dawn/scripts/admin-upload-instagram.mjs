// Upload 12 WP Instagram post thumbnails to Shopify Files and emit a JSON
// manifest the dcway-instagram section can be seeded with.
//
// Run: node scripts/admin-upload-instagram.mjs

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  x ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '01-home-main', 'DC Way Soccer_files');

const STAGED_UPLOADS = `mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}} userErrors{field message}}}`;
const FILE_CREATE = `mutation($files:[FileCreateInput!]!){fileCreate(files:$files){files{id fileStatus ... on MediaImage{image{url}}} userErrors{field message}}}`;
const FILE_BY_ID = `query($id:ID!){node(id:$id){... on MediaImage{id fileStatus image{url}}}}`;
const FILE_BY_ALIAS = `query($q:String!){files(first:1,query:$q){nodes{id ... on MediaImage{image{url}}}}}`;

async function findExisting(alias) {
  const d = await gql(FILE_BY_ALIAS, { q: `filename:${alias}` });
  return d.files.nodes[0] || null;
}

async function uploadOne(spec) {
  const existing = await findExisting(spec.alias);
  if (existing?.image?.url) {
    console.log(`  = ${spec.alias} exists: ${existing.image.url}`);
    return existing.image.url;
  }
  const size = statSync(spec.file).size;
  console.log(`-> ${spec.alias} (${(size / 1024).toFixed(0)} KB)`);
  const st = await gql(STAGED_UPLOADS, {
    input: [{ filename: spec.alias, mimeType: spec.mime, httpMethod: 'POST', resource: 'IMAGE', fileSize: String(size) }],
  });
  if (logErrors('staged', st.stagedUploadsCreate.userErrors)) return null;
  const target = st.stagedUploadsCreate.stagedTargets[0];
  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(spec.file)], { type: spec.mime }), spec.alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) { console.error(`  x upload ${putRes.status}`); return null; }
  const fc = await gql(FILE_CREATE, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt: spec.alt }] });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  const file = fc.fileCreate.files[0];
  let final = file;
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: file.id });
    final = r.node;
    if (!final) break;
  }
  if (final?.fileStatus !== 'READY') { console.error(`  ! status: ${final?.fileStatus}`); }
  console.log(`  + ready: ${final?.image?.url}`);
  return final?.image?.url || null;
}

// Posts in WP order (latest first).
const posts = [
  { type: 'image', url: 'https://www.instagram.com/p/DX4Xt6wDYLK/', thumb: '685374172_122261180744133571_7646679321749564870_nlow.webp', alt: 'This is why we do it.' },
  { type: 'video', url: 'https://www.instagram.com/reel/DXz3VUDDUY2/', thumb: '684680329_18467566009099522_7392597580146563437_nlow.webp', alt: '5 things soccer teaches' },
  { type: 'image', url: 'https://www.instagram.com/p/DXwwKSxjJe3/', thumb: '680484963_122260722440133571_2632776666434499663_nlow.webp', alt: 'Last chance for Early Bird pricing' },
  { type: 'image', url: 'https://www.instagram.com/p/DXpI3OIiADB/', thumb: '680234852_122260722266133571_8186304808398058498_nlow.webp', alt: 'Summer Camp Early Bird ends in 3 days' },
  { type: 'image', url: 'https://www.instagram.com/p/DXmUR0DiXCd/', thumb: '679186836_122260275326133571_3565955909065002826_nlow.webp', alt: "Make your child's birthday unforgettable" },
  { type: 'image', url: 'https://www.instagram.com/p/DXjsDU8kiSD/', thumb: '678236892_122260275182133571_3344664088021916817_nlow.webp', alt: 'One month into spring programs' },
  { type: 'image', url: 'https://www.instagram.com/p/DXewMmHiAUv/', thumb: '679399229_122260275044133571_6366452242532976617_nlow.webp', alt: 'Joining the Great Ward 6 Spring Clean' },
  { type: 'image', url: 'https://www.instagram.com/p/DXZoVQQjdpU/', thumb: '678231774_122260064918133571_3219849945896082654_nlow.webp', alt: 'Summer Camp Early Bird ends April 30' },
  { type: 'video', url: 'https://www.instagram.com/reel/DXRo8a_CceK/', thumb: '671250158_18465092884099522_6637806656720055693_nlow.webp', alt: 'What an incredible week' },
  { type: 'image', url: 'https://www.instagram.com/p/DXMtK1ejcvu/', thumb: '672675432_122259501176133571_2785576223503989717_nlow.webp', alt: 'Early Bird pricing for Summer Camp' },
  { type: 'video', url: 'https://www.instagram.com/reel/DXKBg0MEi5u/', thumb: '670434281_18464600272099522_8476194975542323167_nlow.webp', alt: 'Spring Break Camp is in full swing' },
  { type: 'image', url: 'https://www.instagram.com/p/DXCMEgtAc2D/', thumb: '668687571_122258924390133571_3368660704521899035_nlow.webp', alt: 'Spring Break Camp starts tomorrow' },
];

const results = [];
for (let i = 0; i < posts.length; i++) {
  const p = posts[i];
  const alias = `dcway-ig-${String(i + 1).padStart(2, '0')}.webp`;
  const url = await uploadOne({
    file: join(REF, p.thumb),
    alias,
    mime: 'image/webp',
    alt: p.alt,
  });
  results.push({ ...p, alias, cdn_url: url });
}

const manifest = join(__dirname, 'instagram-manifest.json');
writeFileSync(manifest, JSON.stringify(results, null, 2));
console.log(`\nManifest written: ${manifest}`);
