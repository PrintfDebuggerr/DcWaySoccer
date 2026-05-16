// Standardize all camp products (collections: camps-summer, camps-one-day) so they
// expose a single option named "Week" with at least one value.
//
// Behavior:
//   - Multi-variant product whose option is already "Week": skip.
//   - Multi-variant product whose option is NOT "Week": rename it to "Week".
//   - Single-default-variant product: ADD a "Week" option with 3 placeholder
//     values (Week 1 / Week 2 / Week 3) at the existing variant price.
//
// Run with no args for a dry-run (no writes). Run with `--apply` to commit.
//
//   node scripts/admin-standardize-camp-weeks.mjs           # dry-run
//   node scripts/admin-standardize-camp-weeks.mjs --apply   # commit

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const APPLY = process.argv.includes('--apply');
const ENDPOINT = `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

const gql = async (query, variables = {}) => {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) {
    console.error('GraphQL errors:', JSON.stringify(j.errors, null, 2));
    throw new Error('GraphQL error');
  }
  return j.data;
};

const CAMP_COLLECTIONS = ['camps-summer', 'camps-one-day'];

console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY-RUN (no writes)'}`);
console.log(`Scanning collections: ${CAMP_COLLECTIONS.join(', ')}\n`);

const products = new Map();
for (const handle of CAMP_COLLECTIONS) {
  const d = await gql(
    `query($h:String!){
      collectionByHandle(handle:$h){
        products(first:50){
          nodes{
            id handle title
            options{ id name position values }
            variants(first:50){ nodes{ id title price } }
          }
        }
      }
    }`,
    { h: handle }
  );
  const col = d?.collectionByHandle;
  if (!col) continue;
  for (const p of col.products.nodes) products.set(p.id, p);
}

if (products.size === 0) {
  console.log('No camp products found.');
  process.exit(0);
}

let actionsRename = 0;
let actionsAddOption = 0;

for (const p of products.values()) {
  const opt = p.options[0];
  const isDefaultOnly =
    p.options.length === 1 &&
    opt.name === 'Title' &&
    p.variants.nodes.length === 1 &&
    p.variants.nodes[0].title === 'Default Title';

  if (isDefaultOnly) {
    actionsAddOption++;
    const basePrice = p.variants.nodes[0].price;
    console.log(`• ${p.handle}: ADD option "Week" = [Week 1, Week 2, Week 3] @ ${basePrice}`);
    if (APPLY) {
      const res = await gql(
        `mutation($productId: ID!, $options: [OptionCreateInput!]!, $strategy: ProductOptionCreateVariantStrategy){
          productOptionsCreate(productId: $productId, options: $options, variantStrategy: $strategy){
            userErrors{ field message code }
          }
        }`,
        {
          productId: p.id,
          options: [
            {
              name: 'Week',
              position: 1,
              values: [{ name: 'Week 1' }, { name: 'Week 2' }, { name: 'Week 3' }],
            },
          ],
          strategy: 'CREATE',
        }
      );
      const errs = res.productOptionsCreate.userErrors;
      if (errs.length) console.error(`  ✗ errors:`, errs);
      else console.log(`  ✓ option created`);
    }
    continue;
  }

  if (opt.name !== 'Week') {
    actionsRename++;
    console.log(`• ${p.handle}: RENAME option "${opt.name}" → "Week"`);
    if (APPLY) {
      const res = await gql(
        `mutation($productId: ID!, $option: OptionUpdateInput!){
          productOptionUpdate(productId: $productId, option: $option){
            userErrors{ field message code }
          }
        }`,
        {
          productId: p.id,
          option: { id: opt.id, name: 'Week' },
        }
      );
      const errs = res.productOptionUpdate.userErrors;
      if (errs.length) console.error(`  ✗ errors:`, errs);
      else console.log(`  ✓ renamed`);
    }
    continue;
  }

  console.log(`• ${p.handle}: already "Week" — skip`);
}

console.log(`\nSummary: ${actionsAddOption} option(s) to add, ${actionsRename} option(s) to rename.`);
if (!APPLY) console.log(`Re-run with --apply to commit.`);
