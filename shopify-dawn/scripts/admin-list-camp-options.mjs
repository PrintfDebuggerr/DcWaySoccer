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

const ENDPOINT = `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;
const gql = async (q, v = {}) => {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query: q, variables: v }),
  });
  return (await r.json()).data;
};

const collections = ['camps-summer', 'camps-one-day', 'programs', 'programs-clinics', 'programs-private', 'programs-after-school'];
for (const handle of collections) {
  const d = await gql(`query($h:String!){ collectionByHandle(handle:$h){ id title products(first:50){ nodes { handle title options{ name values } variants(first:20){ nodes { id title } } } } } }`, { h: handle });
  const col = d?.collectionByHandle;
  if (!col) { console.log(`(missing: ${handle})`); continue; }
  console.log(`\n${col.title}  [${handle}]`);
  for (const p of col.products.nodes) {
    const opts = p.options.map((o) => `${o.name}=[${o.values.join(',')}]`).join(' / ');
    console.log(`  · ${p.handle}`);
    console.log(`      options: ${opts || '(none)'}`);
    for (const v of p.variants.nodes) console.log(`      variant: ${v.title}  id=${v.id}`);
  }
}
