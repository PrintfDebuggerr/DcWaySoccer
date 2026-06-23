// Bootstrap the pre-checkout form (task #6) admin-managed content:
//   - dcway_waiver metaobject (title, body, required, sort_order) + 3 sample waivers
//   - dcway_checkout_section metaobject (title, trigger_tag, instructions, fields, sort_order)
//     + 2 samples (One Day Option for camps, Team/Friend Request for the league)
// Run: node scripts/admin-bootstrap-checkout-form.mjs

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
const ue = (l, a) => { if (a && a.length) { console.error(`  ✗ ${l}:`, JSON.stringify(a)); return true; } return false; };

async function ensureDefinition(type, name, fields) {
  const existing = await gql(`{ metaobjectDefinitionByType(type:"${type}"){ id } }`);
  if (existing.metaobjectDefinitionByType) { console.log(`= ${type} exists`); return existing.metaobjectDefinitionByType.id; }
  const r = await gql(`
    mutation($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`, {
    definition: {
      type, name,
      access: { storefront: 'PUBLIC_READ' },
      capabilities: { publishable: { enabled: true } },
      fieldDefinitions: fields,
    },
  });
  if (ue(`def ${type}`, r.metaobjectDefinitionCreate.userErrors)) process.exit(1);
  console.log(`✓ created ${type}`);
  return r.metaobjectDefinitionCreate.metaobjectDefinition.id;
}

const UPSERT = `
  mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message code }
    }
  }`;
async function upsert(type, handle, fields) {
  const r = await gql(UPSERT, {
    handle: { type, handle },
    metaobject: { capabilities: { publishable: { status: 'ACTIVE' } }, fields },
  });
  if (ue(`upsert ${handle}`, r.metaobjectUpsert.userErrors)) return;
  console.log(`  ✓ ${handle}`);
}

// ---- 1. Definitions ----
await ensureDefinition('dcway_waiver', 'Waiver', [
  { key: 'title', name: 'Title', type: 'single_line_text_field' },
  { key: 'body', name: 'Body', type: 'multi_line_text_field' },
  { key: 'required', name: 'Required', type: 'boolean' },
  { key: 'sort_order', name: 'Sort order', type: 'number_integer' },
]);
await ensureDefinition('dcway_checkout_section', 'Checkout form section', [
  { key: 'title', name: 'Title', type: 'single_line_text_field' },
  { key: 'trigger_tag', name: 'Trigger tag', type: 'single_line_text_field', description: 'Shows this section when a cart item has this product tag (blank = always).' },
  { key: 'instructions', name: 'Instructions', type: 'multi_line_text_field' },
  { key: 'fields', name: 'Fields', type: 'multi_line_text_field', description: 'One field label per line. Each becomes a text input. Add * to make required, e.g. "Friend name*".' },
  { key: 'sort_order', name: 'Sort order', type: 'number_integer' },
]);

// ---- 2. Seed waivers ----
console.log('\n→ Waivers');
await upsert('dcway_waiver', 'waiver-liability', [
  { key: 'title', value: 'Liability Waiver & Release' },
  { key: 'body', value: 'I acknowledge the risks involved in soccer activities and release DC Way Soccer, its coaches and staff from liability for injuries sustained during participation. I confirm my child is physically able to participate.' },
  { key: 'required', value: 'true' }, { key: 'sort_order', value: '1' },
]);
await upsert('dcway_waiver', 'waiver-media', [
  { key: 'title', value: 'Photo & Media Consent' },
  { key: 'body', value: 'I grant DC Way Soccer permission to use photographs and video of my child taken during programs for promotional and educational purposes.' },
  { key: 'required', value: 'true' }, { key: 'sort_order', value: '2' },
]);
await upsert('dcway_waiver', 'waiver-policies', [
  { key: 'title', value: 'Program Policies & Refunds' },
  { key: 'body', value: 'I have read and agree to DC Way Soccer’s program policies, including the cancellation and refund policy, behavior expectations, and pick-up/drop-off procedures.' },
  { key: 'required', value: 'true' }, { key: 'sort_order', value: '3' },
]);

// ---- 3. Seed program-specific sections ----
console.log('\n→ Program sections');
await upsert('dcway_checkout_section', 'section-one-day', [
  { key: 'title', value: 'One Day Option' },
  { key: 'trigger_tag', value: 'reg-cat-summer' },
  { key: 'instructions', value: 'For single-day registrations, tell us which day(s) your child will attend.' },
  { key: 'fields', value: 'Day(s) attending*\nDrop-off time\nPick-up time' },
  { key: 'sort_order', value: '1' },
]);
await upsert('dcway_checkout_section', 'section-team-friend', [
  { key: 'title', value: 'Team or Friend Request' },
  { key: 'trigger_tag', value: 'reg-cat-capitol-hill-league' },
  { key: 'instructions', value: 'Capitol Hill League: request to be placed with a specific team or friend (not guaranteed).' },
  { key: 'fields', value: 'Friend or teammate name\nPreferred team' },
  { key: 'sort_order', value: '2' },
]);

console.log('\nDone. Render via shop.metaobjects.dcway_waiver / dcway_checkout_section.');
