// Bootstrap the "Our Team" content for /pages/about:
//   1. Create the `team_member` metaobject definition (if missing).
//   2. Upload each member's photo from wordpress-reference/ to Shopify Files.
//   3. Upsert one metaobject per member with photo, name, role, bio, position.
//
// Run: node scripts/admin-bootstrap-team.mjs

import { readFileSync, statSync } from 'node:fs';
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

const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '02-about-us', 'About Us - DC Way Soccer_files');

const TEAM = [
  {
    handle: 'denis-chekuristov',
    name: 'Denis Chekuristov',
    role: 'Founder & Program Director',
    file: join(REF, 'coach-denis-scaled.jpg'),
    mime: 'image/jpeg',
    bio: "Denis Chekuristov's passion for soccer runs deep, rooted in a family tradition of both the sport and education. His father, a professional soccer player, introduced Denis to the game before he could even walk, while his mother's 25+ years of teaching shaped his own commitment to education and development. Denis grew up training in the Volgar Gazprom FC youth academy system, competed successfully at the collegiate level, and was one of the pioneers of futsal in his hometown of Astrakhan, Russia.\n\nWith a National Soccer Coaching License for ages 8-12 and a Coerver Coaching Youth Diploma, Denis continuously seeks opportunities to refine his skills by attending coaching seminars. His dedication to the game and to young athletes earned him recognition as the Best Sports Coach by Washington City Paper in both 2016 and 2017.",
    position: 1,
  },
  {
    handle: 'roman-kilishek',
    name: 'Roman Kilishek',
    role: 'Executive Director',
    file: join(REF, 'roman.jpg'),
    mime: 'image/jpeg',
    bio: "Roman Kilishek's passion for soccer began in childhood, and he attributes much of his personal and professional growth to the game. With an MBA from George Mason University and a strong background in finance and project management, Roman brings a unique blend of strategic vision and hands-on management to DC Way. His expertise has been instrumental in streamlining our day-to-day operations, ensuring our programs run seamlessly and efficiently.\n\nRoman's commitment to DC Way goes beyond administration; he is dedicated to fostering an environment where young players can discover their own love for soccer.",
    position: 2,
  },
  {
    handle: 'russ-guliyev',
    name: 'Russ Guliyev',
    role: 'Manager of Operations',
    file: join(REF, 'coach-russ.jpg'),
    mime: 'image/jpeg',
    bio: "Russ Guliyev brings a wealth of experience and dedication to his role as DC Way's Manager of Operations. With a deep love for soccer and a strong commitment to youth development, Russ oversees every aspect of our programs, from planning and organization to working closely with coaches to ensure top-quality training.\n\nAs a proud father, Russ has a personal connection to DC Way's mission. His hands-on approach and unwavering dedication make him an integral part of the DC Way family.",
    position: 3,
  },
  {
    handle: 'melis-bayraktaroglu',
    name: 'Melis Bayraktaroglu',
    role: 'Marketing Manager',
    file: join(REF, 'melis.png'),
    mime: 'image/png',
    bio: "Melis Bayraktaroglu is a graduate of The George Washington University School of Business, where she earned a Bachelor's Degree in Business Administration with a concentration in Marketing and a minor in Organizational Sciences. Growing up in Turkey, Melis developed a passion for tennis, competing in professional tournaments before joining the varsity tennis team at GW.\n\nWith her diverse marketing experience, organizational acumen, and leadership skills, Melis plays a pivotal role in coordinating DC Way's programs and ensuring our messaging resonates with families.",
    position: 4,
  },
  {
    handle: 'anya-chekuristov',
    name: 'Anya Chekuristov',
    role: 'Customer Service Manager & Junior Assistant Coordinator',
    file: join(REF, 'PHOTO-2025-04-25-06-41-22.jpg'),
    mime: 'image/jpeg',
    bio: "Anya brings a dynamic blend of athletic experience, health expertise, and customer care to her role at DC Way. She holds a Bachelor's degree in Physical Culture Education and Sport Journalism, along with an Associate degree in Physical Therapy. Originally from Russia, Anya began her career as a rhythmic gymnast and youth journalist for a national TV station — an early fusion of sports and storytelling that continues to inspire her work today.\n\nAfter moving to the United States, Anya pursued her passion for wellness through physical therapy, gaining hands-on clinical experience before joining DC Way. As our Customer Service Manager, she plays a key role in supporting families, streamlining communications, and helping ensure every DC Way experience is positive and professional.",
    position: 5,
  },
  {
    handle: 'onur-senol',
    name: 'Onur Senol',
    role: 'Digital Marketing Specialist',
    file: join(REF, '22.png'),
    mime: 'image/png',
    bio: "Onur Senol has been a vital part of the DC Way team for over two years, bringing a wealth of digital marketing expertise to our organization. With a keen eye for detail and a deep understanding of online strategies, Onur plays a crucial role in elevating DC Way's presence across digital platforms.\n\nHis innovative approach to content creation, social media campaigns, and online advertising has helped amplify our message and connect with families, players, and the community.",
    position: 6,
  },
  {
    handle: 'mae-holmberg',
    name: 'Mae Holmberg',
    role: 'Program Manager',
    file: join(REF, 'screenshot-2024-11-08-at-20.35.58.jpeg'),
    mime: 'image/jpeg',
    bio: "Mae Holmberg has been an invaluable part of the DC Way team for the past three years, bringing dedication, warmth, and a keen attention to detail to her role as Program Manager. Mae quickly grew into an amazing leader who ensures that each program runs smoothly and efficiently.\n\nShe is committed to creating a supportive and fun environment for all, making sure every child has a memorable experience on and off the field.",
    position: 7,
  },
];

// ───────────── 1. Ensure team_member metaobject definition ─────────────
console.log('→ Ensuring team_member metaobject definition...');
const DEF_CREATE = `
  mutation Create($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;
const defs = await gql(`{ metaobjectDefinitions(first:50){ nodes{ id type } } }`);
let teamDefId = defs.metaobjectDefinitions.nodes.find((n) => n.type === 'team_member')?.id;
if (teamDefId) {
  console.log(`  · already exists: team_member → ${teamDefId}`);
} else {
  const r = await gql(DEF_CREATE, {
    definition: {
      name: 'Team member',
      type: 'team_member',
      access: { storefront: 'PUBLIC_READ' },
      capabilities: { publishable: { enabled: true } },
      displayNameKey: 'name',
      fieldDefinitions: [
        { key: 'name', name: 'Name', type: 'single_line_text_field', required: true },
        { key: 'role', name: 'Role', type: 'single_line_text_field' },
        { key: 'photo', name: 'Photo', type: 'file_reference', validations: [{ name: 'file_type_options', value: '["Image"]' }] },
        { key: 'bio', name: 'Bio', type: 'multi_line_text_field' },
        { key: 'position', name: 'Display order', type: 'number_integer' },
      ],
    },
  });
  if (logErrors('team_member def', r.metaobjectDefinitionCreate.userErrors)) process.exit(1);
  teamDefId = r.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`  ✓ created team_member → ${teamDefId}`);
}

// ───────────── 2. File upload helpers ─────────────
const STAGED = `
  mutation StagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;
const FILE_CREATE = `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus ... on MediaImage { image { url } } }
      userErrors { field message }
    }
  }
`;
const FILE_BY_ID = `query($id: ID!) { node(id: $id) { ... on MediaImage { id fileStatus image { url } } } }`;

async function uploadFile(filePath, alias, mime, alt) {
  const size = statSync(filePath).size;
  const staged = await gql(STAGED, {
    input: [{ filename: alias, mimeType: mime, httpMethod: 'POST', resource: 'IMAGE', fileSize: String(size) }],
  });
  if (logErrors('staged', staged.stagedUploadsCreate.userErrors)) return null;
  const target = staged.stagedUploadsCreate.stagedTargets[0];
  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(filePath)], { type: mime }), alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) { console.error(`  ✗ PUT ${putRes.status}`); return null; }
  const fc = await gql(FILE_CREATE, { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt }] });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  let final = fc.fileCreate.files[0];
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: final.id });
    final = r.node;
    if (!final) break;
  }
  return final?.id || null;
}

// ───────────── 3. Metaobject upsert helpers ─────────────
const MO_BY_HANDLE = `
  query($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) { id handle }
  }
`;
const MO_UPSERT = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle displayName }
      userErrors { field message code }
    }
  }
`;

// ───────────── 4. Upload photos + upsert metaobjects ─────────────
console.log('\n→ Uploading photos + upserting team members...');
for (const m of TEAM) {
  console.log(`\n  ${m.handle}`);
  const alias = `team-${m.handle}${m.mime === 'image/png' ? '.png' : '.jpg'}`;
  const photoId = await uploadFile(m.file, alias, m.mime, `${m.name} — ${m.role}`);
  if (!photoId) { console.error(`  ✗ photo upload failed for ${m.handle}`); continue; }
  console.log(`    ✓ photo: ${photoId}`);

  const r = await gql(MO_UPSERT, {
    handle: { type: 'team_member', handle: m.handle },
    metaobject: {
      capabilities: { publishable: { status: 'ACTIVE' } },
      fields: [
        { key: 'name', value: m.name },
        { key: 'role', value: m.role },
        { key: 'photo', value: photoId },
        { key: 'bio', value: m.bio },
        { key: 'position', value: String(m.position) },
      ],
    },
  });
  if (logErrors(`upsert ${m.handle}`, r.metaobjectUpsert.userErrors)) continue;
  console.log(`    ✓ metaobject: ${r.metaobjectUpsert.metaobject.id}`);
}

console.log('\nDone. Render via shop.metaobjects.team_member.values, sorted by `position` ascending.');
