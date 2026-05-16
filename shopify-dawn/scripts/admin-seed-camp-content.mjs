// Phase 4C: seed art-soccer-summer-camp with realistic includes_bullets + faq metafield data
// so the new camp-includes + camp-faq sections render against real content.

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

const includesBullets = [
  'Half-day program (9:00 AM – 1:00 PM)',
  'Daily snacks (parents pack lunch)',
  'Camp t-shirt for every camper',
  'Soccer ball to take home on the last day',
  'End-of-week tournament with awards',
  'Daily art project tied to the week’s theme',
  'Small coach-to-camper ratio (1:8)',
  'Capitol Hill Field — fully shaded turf area',
].join('\n');

const faq = [
  'What ages can attend?',
  'Ages 5–8. We split into two skill groups within the camp so first-timers and returning players each get age-appropriate work.',
  '',
  'What should my child bring?',
  'Cleats or sneakers, shin guards, a refillable water bottle, sunscreen applied before drop-off, a hat, and packed lunch. Wednesdays are water-day — bring a swimsuit + towel.',
  '',
  'What if my child has never played soccer?',
  'That is totally fine. The camp is structured for first-timers and returning players alike. Coaches start every morning with foundational technique work.',
  '',
  'Do you offer multi-week or sibling discounts?',
  'Yes — register for two or more weeks, or two or more siblings, and the second registration is 10% off. The discount is applied automatically at checkout.',
  '',
  'What is your cancellation policy?',
  'Full refunds up to 14 days before the camp start date. After that, we issue credit toward another DC Way camp or program in the same calendar year.',
  '',
  'Where is drop-off and pickup?',
  'Capitol Hill Field, 700 14th St SE. There is street parking on 14th and a 5-minute kiss-and-go zone at the field gate.',
].join('\n');

console.log('→ Looking up product...');
const d = await gql(
  `query($q:String!){ products(first:1, query:$q){ nodes{ id handle title } } }`,
  { q: 'handle:art-soccer-summer-camp' }
);
const product = d.products.nodes[0];
if (!product) { console.error('  ✗ product not found'); process.exit(1); }
console.log(`  ✓ ${product.handle} (${product.id})`);

console.log('\n→ Setting dcway.includes_bullets + dcway.faq...');
const r = await gql(
  `mutation Set($metafields:[MetafieldsSetInput!]!){
    metafieldsSet(metafields:$metafields){
      metafields{ id namespace key value }
      userErrors{ field message }
    }
  }`,
  {
    metafields: [
      { ownerId: product.id, namespace: 'dcway', key: 'includes_bullets', type: 'multi_line_text_field', value: includesBullets },
      { ownerId: product.id, namespace: 'dcway', key: 'faq', type: 'multi_line_text_field', value: faq },
    ],
  }
);
if (r.metafieldsSet.userErrors.length) {
  console.error(JSON.stringify(r.metafieldsSet.userErrors, null, 2));
  process.exit(1);
}
console.log(`  ✓ ${r.metafieldsSet.metafields.length} metafields set`);
console.log('\nDone.');
