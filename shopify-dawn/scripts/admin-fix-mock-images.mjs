// Picsum failed Shopify's server-side image fetch (status=FAILED on all 11 products,
// likely due to Picsum's redirect chain). This script:
//   1. Deletes any FAILED media on DC Way Soccer products
//   2. Re-attaches with curated Unsplash CDN URLs (direct, no redirects)
//
// Image picks: a small pool of soccer-themed Unsplash photos, mapped by category.
// Per-handle fallback to a generic image if not in the map.
//
// Run: node scripts/admin-fix-mock-images.mjs

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

// Curated stable Unsplash CDN URLs. Direct images.unsplash.com endpoint,
// no redirect, no auth required. Width/quality query params are honored.
const UNSPLASH = (id, w, h) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

const PRODUCT_IMAGES = {
  // ----- Camps (4:3 landscape) -----
  'art-soccer-summer-camp':       UNSPLASH('1502810190503-8303b3e6e89e', 1200, 800), // kids playing
  'all-star-soccer-camp-week-1':  UNSPLASH('1551958219-acbc608c6377',    1200, 800), // soccer field
  'goalkeeper-academy-summer':    UNSPLASH('1556056504-5c7696c4c28d',    1200, 800), // stadium goal
  // ----- Programs (4:3 landscape) -----
  'saturday-academy-spring':      UNSPLASH('1574629810360-7efbbe195018', 1200, 800), // youth training
  'after-school-soccer-mondays':  UNSPLASH('1517649763962-0c623066013b', 1200, 800), // ball + grass
  'private-lesson-30':            UNSPLASH('1610068983594-7e7adcacc2bd', 1200, 800), // 1-on-1
  'skills-clinic-wednesdays':     UNSPLASH('1431324155629-1a6deb1dec8d', 1200, 800), // ball on field
  // ----- Membership -----
  'annual-member-family':         UNSPLASH('1543326727-cf6c39e8f84c',    1200, 800), // soccer scene
  // ----- Merch (1:1 square) -----
  'dc-way-youth-panna-tshirt':    UNSPLASH('1556906781-9a412961c28c',    1200, 1200), // jersey
  'dc-way-custom-ball':           UNSPLASH('1614632537190-23e4146777db', 1200, 1200), // ball closeup
  'dc-way-shin-guards':           UNSPLASH('1599058917212-d750089bc07e', 1200, 1200), // sports gear
};

const FALLBACK_LANDSCAPE = UNSPLASH('1431324155629-1a6deb1dec8d', 1200, 800);

// ----- 1. List products + existing media -----
console.log('→ Listing products + existing media status...');
const products = [];
let cursor = null;
while (true) {
  const d = await gql(
    `query($cursor:String){
      products(first: 50, after: $cursor, query: "vendor:'DC Way Soccer'") {
        nodes {
          id handle title
          media(first: 10) {
            nodes {
              id
              ... on MediaImage { status }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { cursor }
  );
  products.push(...d.products.nodes);
  if (!d.products.pageInfo.hasNextPage) break;
  cursor = d.products.pageInfo.endCursor;
}
console.log(`  ✓ ${products.length} products`);

// ----- 2. Delete FAILED media -----
const DELETE_MEDIA = `
  mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
    productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
      deletedMediaIds
      mediaUserErrors { field message code }
    }
  }
`;

console.log('\n→ Deleting FAILED media...');
let deleted = 0;
for (const p of products) {
  const failedIds = p.media.nodes.filter((m) => m.status === 'FAILED').map((m) => m.id);
  if (!failedIds.length) continue;
  const r = await gql(DELETE_MEDIA, { productId: p.id, mediaIds: failedIds });
  const ue = r.productDeleteMedia.mediaUserErrors;
  if (ue?.length) {
    console.error(`  ✗ ${p.handle}: ${JSON.stringify(ue)}`);
  } else {
    console.log(`  ✓ ${p.handle} (${failedIds.length} removed)`);
    deleted += failedIds.length;
  }
}
console.log(`  → ${deleted} failed media removed`);

// ----- 3. Re-attach with Unsplash URLs -----
const CREATE_MEDIA = `
  mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id status } }
      mediaUserErrors { field message code }
    }
  }
`;

console.log('\n→ Attaching Unsplash mock images...');
let ok = 0;
for (const p of products) {
  // Skip if product still has non-failed media after the cleanup
  // (re-read state quickly)
  const stateRefresh = await gql(
    `query($id:ID!){ product(id:$id){ media(first:1){ nodes{ id ... on MediaImage { status } } } } }`,
    { id: p.id }
  );
  const remaining = stateRefresh.product.media.nodes.filter((m) => m.status !== 'FAILED');
  if (remaining.length > 0) {
    console.log(`  · ${p.handle}: already has ${remaining.length} non-failed media, skip`);
    continue;
  }
  const url = PRODUCT_IMAGES[p.handle] || FALLBACK_LANDSCAPE;
  const r = await gql(CREATE_MEDIA, {
    productId: p.id,
    media: [{ mediaContentType: 'IMAGE', originalSource: url, alt: `${p.title} — placeholder` }],
  });
  const ue = r.productCreateMedia.mediaUserErrors;
  if (ue?.length) {
    console.error(`  ✗ ${p.handle}: ${JSON.stringify(ue)}`);
  } else {
    console.log(`  ✓ ${p.handle} ← ${url.split('?')[0]}`);
    ok++;
  }
}

console.log(`\n${ok} attached. Shopify is fetching asynchronously — wait ~30s and re-query status to verify.`);
