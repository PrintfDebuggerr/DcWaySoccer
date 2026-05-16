// Attach a stable mock image to every DC Way Soccer product that doesn't already
// have media. Pulls from picsum.photos with a per-handle seed so each product
// gets a deterministic placeholder photo (re-running yields the same images).
//
// Camps/programs/membership → 4:3 landscape (1200x800).
// Merch → 1:1 square (1200x1200).
//
// Skips products that already have ≥1 media attached (idempotent).
//
// Run: node scripts/admin-attach-mock-images.mjs

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

const isMerch = (handle, productType) => {
  if (productType && ['T-Shirts', 'Balls', 'Shin Guards', 'Apparel'].includes(productType)) return true;
  return handle && (handle.startsWith('dc-way-') && !handle.includes('camp') && !handle.includes('program'));
};

function mockUrlFor(product) {
  // Stable per-handle seed → deterministic photo every run.
  const seed = `dcway-${product.handle}`;
  const merch = isMerch(product.handle, product.productType);
  const w = 1200;
  const h = merch ? 1200 : 800;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// ----- 1. List all DC Way Soccer products + current media counts -----
console.log('→ Listing DC Way Soccer products...');
const products = [];
let cursor = null;
while (true) {
  const d = await gql(
    `query($cursor:String){
      products(first: 50, after: $cursor, query: "vendor:'DC Way Soccer'") {
        nodes { id handle title productType media(first: 1) { nodes { id } } mediaCount { count } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { cursor }
  );
  for (const p of d.products.nodes) {
    products.push({ id: p.id, handle: p.handle, title: p.title, productType: p.productType, mediaCount: p.mediaCount?.count ?? p.media.nodes.length });
  }
  if (!d.products.pageInfo.hasNextPage) break;
  cursor = d.products.pageInfo.endCursor;
}
console.log(`  ✓ ${products.length} products total`);

const needsImage = products.filter((p) => p.mediaCount === 0);
console.log(`  → ${needsImage.length} need a mock image (${products.length - needsImage.length} already have media)`);

if (needsImage.length === 0) {
  console.log('\n✓ Nothing to do.');
  process.exit(0);
}

// ----- 2. Attach one image per product -----
const CREATE_MEDIA = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id status } }
      mediaUserErrors { field message code }
      product { id }
    }
  }
`;

console.log('\n→ Attaching mock images...');
let ok = 0;
let fail = 0;
for (const p of needsImage) {
  const url = mockUrlFor(p);
  const merch = isMerch(p.handle, p.productType);
  const alt = `${p.title} — placeholder ${merch ? 'product' : 'event'} image`;
  const r = await gql(CREATE_MEDIA, {
    productId: p.id,
    media: [{ mediaContentType: 'IMAGE', originalSource: url, alt }],
  });
  const ue = r.productCreateMedia.mediaUserErrors;
  if (ue?.length) {
    console.error(`  ✗ ${p.handle}: ${JSON.stringify(ue)}`);
    fail++;
  } else {
    console.log(`  ✓ ${p.handle} ← ${url}`);
    ok++;
  }
}

console.log(`\nDone. ${ok} attached, ${fail} failed.`);
console.log('Shopify is fetching the images asynchronously — refresh the storefront in 30–60s for them to appear.');
