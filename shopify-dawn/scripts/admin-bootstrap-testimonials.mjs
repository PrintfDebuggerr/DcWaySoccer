// Bootstrap 6 WP-faithful testimonials into the `testimonial` metaobject.
// Idempotent: upserts by handle.
//
// Run: node scripts/admin-bootstrap-testimonials.mjs

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  x ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

const UPSERT = `
  mutation MetaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName fields { key value } }
      userErrors { field message code }
    }
  }
`;

const testimonials = [
  {
    handle: 'erin-mother-of-claire',
    author: 'ERIN, MOTHER OF CLAIRE (11)',
    role: 'Parent',
    rating: 5,
    quote: 'Fantastic goalkeeper camp. My daughter loved it and learned so much. I was really impressed with what she described as well — lots of practice but lots of strategy and technique too.',
    position: 1,
  },
  {
    handle: 'eden-mother-of-luciana',
    author: 'EDEN, MOTHER OF LUCIANA (9)',
    role: 'Parent',
    rating: 5,
    quote: "Coach Denis is wonderful with children. He makes it fun, but at the same time, he improved my daughter's technique.",
    position: 2,
  },
  {
    handle: 'christine-mother-of-sophia-sasha',
    author: 'CHRISTINE, MOTHER OF SOPHIA (9) & SASHA (8)',
    role: 'Parent',
    rating: 5,
    quote: 'Coach Denis works magic with the kids! Not only does he motivate my daughters, he brings measurable improvement to their game. My kids are always talking about how much they like playing for Coach Denis.',
    position: 3,
  },
  {
    handle: 'chalis-mother-of-gael-sebastian',
    author: 'CHALIS, MOTHER OF GAEL (8) & SEBASTIAN (10)',
    role: 'Parent',
    rating: 5,
    quote: 'My sons have worked with Denis for more than 3 years in camps, academies, and travel team. They have developed great technical skills and a better understanding of the game under his tutelage. His love for the game is obvious.',
    position: 4,
  },
  {
    handle: 'gayle-mother-of-torsten',
    author: 'GAYLE, MOTHER OF TORSTEN (9)',
    role: 'Parent',
    rating: 5,
    quote: "Coach Denis' enthusiasm about soccer is clear, and his love of the game rubs off on the kids.",
    position: 5,
  },
  {
    handle: 'katie-mother-of-iris',
    author: 'KATIE, MOTHER OF IRIS (6)',
    role: 'Parent',
    rating: 5,
    quote: "Being part of DC Way has given Iris a lot of confidence. It's helping her discover which sports she likes, and I think she enjoys spending time with her friends. It's a fun way to be active, get outside, and learn more about soccer.",
    position: 6,
  },
];

console.log(`Seeding ${testimonials.length} testimonials\n`);

for (const t of testimonials) {
  const data = await gql(UPSERT, {
    handle: { type: 'testimonial', handle: t.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'author', value: t.author },
        { key: 'quote', value: t.quote },
        { key: 'rating', value: String(t.rating) },
        { key: 'role', value: t.role },
      ],
    },
  });
  if (logErrors('metaobjectUpsert', data.metaobjectUpsert.userErrors)) continue;
  console.log(`  + ${t.handle}: ${data.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone.');
