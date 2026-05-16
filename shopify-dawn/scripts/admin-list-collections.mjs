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
const r = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
  body: JSON.stringify({
    query: `{ collections(first: 100) { nodes { handle title productsCount { count } } } }`,
  }),
});
const j = await r.json();
if (j.errors) {
  console.error(JSON.stringify(j.errors, null, 2));
  process.exit(1);
}
for (const c of j.data.collections.nodes) {
  console.log(c.handle.padEnd(40), String(c.productsCount.count).padStart(3), c.title);
}
