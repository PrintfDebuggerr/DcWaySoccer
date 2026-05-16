// Seed the Shopify Online Store "main-menu" navigation with DC Way's WP nav structure.
//
// Run: node scripts/admin-bootstrap-menu.mjs

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  ✗ ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

// All items use type HTTP with absolute or relative URLs. Sub-items live under `items`.
const ITEMS = [
  { title: 'Home', type: 'HTTP', url: '/' },
  { title: 'About', type: 'HTTP', url: '/pages/about' },
  {
    title: 'Camps',
    type: 'HTTP',
    url: '/pages/camps',
    items: [
      { title: 'Summer Camp', type: 'HTTP', url: '/pages/camps#summer-camp' },
      { title: 'One Day Camp', type: 'HTTP', url: '/pages/camps#one-day-camp' },
      { title: 'Art & Soccer Day Camp', type: 'HTTP', url: '/pages/camps#art-soccer-day-camp' },
      { title: 'Brazilian Way Summer Camp', type: 'HTTP', url: '/pages/camps#brazilian-way' },
      { title: 'World Cup Summer Camp', type: 'HTTP', url: '/pages/camps#world-cup' },
    ],
  },
  {
    title: 'Programs',
    type: 'HTTP',
    url: '/pages/programs',
    items: [
      { title: 'Capitol Hill Spring League', type: 'HTTP', url: '/pages/programs#capitol-hill-spring-league' },
      { title: 'Weekly Skills Clinics', type: 'HTTP', url: '/pages/programs#weekly-skills-clinics' },
      { title: 'Goalkeeping School', type: 'HTTP', url: '/pages/programs#goalkeeping-school' },
      { title: 'Kids Academy', type: 'HTTP', url: '/pages/programs#kids-academy' },
      { title: 'Challenge Level', type: 'HTTP', url: '/pages/programs#challenge-level' },
      { title: 'Adult Skills Clinics', type: 'HTTP', url: '/pages/programs#adult-skills-clinics' },
      { title: 'Private Lessons', type: 'HTTP', url: '/pages/programs#private-lessons' },
      { title: 'Soccer Birthday Party', type: 'HTTP', url: '/pages/programs#soccer-birthday-party' },
      { title: 'Youth Leadership Programs', type: 'HTTP', url: '/pages/programs#youth-leadership' },
    ],
  },
  { title: 'Membership', type: 'HTTP', url: '/pages/membership' },
  {
    title: 'Resources',
    type: 'HTTP',
    url: '/pages/resources',
    items: [
      { title: 'Weather Updates', type: 'HTTP', url: '/pages/weather-updates' },
      { title: 'DC Way Academy', type: 'HTTP', url: '/pages/dc-way-academy' },
      { title: 'Blog', type: 'HTTP', url: '/blogs/news' },
      { title: 'DC Way Merchandise', type: 'HTTP', url: '/collections/all' },
      { title: 'Gallery', type: 'HTTP', url: '/pages/gallery' },
      { title: 'FAQ', type: 'HTTP', url: '/pages/faq' },
      { title: 'Contact Us', type: 'HTTP', url: '/pages/contact' },
      { title: 'Cancellation Policy', type: 'HTTP', url: '/policies/refund-policy' },
    ],
  },
];

const FIND = `
  query($handle: String!) {
    menus(first: 50, query: $handle) {
      nodes { id handle title }
    }
  }
`;
const CREATE = `
  mutation MenuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { id handle }
      userErrors { field message }
    }
  }
`;
const UPDATE = `
  mutation MenuUpdate($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
    menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
      menu { id handle }
      userErrors { field message }
    }
  }
`;

console.log('→ Looking for existing main-menu...');
const f = await gql(FIND, { handle: 'main-menu' });
const existing = f.menus.nodes.find((n) => n.handle === 'main-menu');

if (existing) {
  console.log(`  · found: ${existing.id}; updating...`);
  const r = await gql(UPDATE, { id: existing.id, title: 'Main menu', handle: 'main-menu', items: ITEMS });
  if (logErrors('menuUpdate', r.menuUpdate.userErrors)) process.exit(1);
  console.log(`  ✓ updated: ${r.menuUpdate.menu.id}`);
} else {
  console.log('  · not found; creating...');
  const r = await gql(CREATE, { title: 'Main menu', handle: 'main-menu', items: ITEMS });
  if (logErrors('menuCreate', r.menuCreate.userErrors)) process.exit(1);
  console.log(`  ✓ created: ${r.menuCreate.menu.id}`);
}

console.log('\nDone. Configure the section to use linklist handle "main-menu" (already default).');
