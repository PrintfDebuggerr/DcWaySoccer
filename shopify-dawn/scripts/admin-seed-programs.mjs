// Seed 15 WP-matching programs into the `programs` collection.
// - Uploads each WP image to Shopify Files (via productCreateMedia with originalSource URL).
// - Creates products with WP title/description (status DRAFT — no checkout).
// - Removes old placeholder products from the `programs` collection (does not delete them).
// Idempotent on handle.

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
const logErrors = (l, ue) => { if (ue?.length) { console.error(`  X ${l}:`, JSON.stringify(ue, null, 2)); return true; } return false; };

// ----- 15 programs in exact WP display order -----
const programs = [
  // Page 1
  {
    handle: 'kids-academy', title: 'Kids Academy',
    descriptionHtml: '<p>Kids Academy is the ultimate introduction to soccer, combining skill-building, teamwork, and nonstop fun! Young athletes develop fundamental skills in a safe and engaging environment where every session is built around growing as a player and having a great time.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/capitol-hill-league_06-03-2023-0020.jpg',
  },
  {
    handle: 'challenge-level', title: 'Challenge Level',
    descriptionHtml: '<p>The Challenge Level Program is an exciting, high-energy program designed for 3rd-6th graders who are eager to improve, compete, and challenge themselves in a structured, development-focused environment. This program blends high-quality training with competitive league play.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/DSC06546-Lauryn-Taylor.jpg',
  },
  {
    handle: 'adult-skills-clinics', title: 'Adult Skills Clinics',
    descriptionHtml: '<p>Learning never stops, no matter your age. DC Way’s Adult Skills Clinics are designed for players who love the game and want to grow beyond the basics. You’ll refine your technical skills (passing, control, and finishing) while also developing your ability to read the game, recognize space, and anticipate what’s happening off the ball.</p>',
    image: 'https://dcway.com/wp-content/uploads/2025/09/Screenshot-2025-09-17-at-14.18.58.png',
  },
  {
    handle: 'after-school-program-at-sherwood-rec', title: 'After-School Program at Sherwood Rec',
    descriptionHtml: '<p>We believe in offering more than just aftercare — we provide real enrichment. From hands-on projects to active play, every afternoon is filled with purpose, energy, and joy. Young learners explore sports, art, and smart/board games, all in one joyful, safe space.</p>',
    image: 'https://dcway.com/wp-content/uploads/2025/09/IMG_1410.jpg',
  },
  {
    handle: 'capitol-hill-spring-league', title: 'Capitol Hill Spring League',
    descriptionHtml: '<p>The Capitol Hill Spring League is where kids play soccer, grow their confidence, and build friendships that last beyond the season. Your child will play weekend games, practice with experienced coaches, and be part of a community that celebrates effort and growth.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/capitol-hill-league.jpg',
  },
  {
    handle: 'weekly-skills-clinics', title: 'Weekly Skills Clinics',
    descriptionHtml: '<p>Join us for high-energy soccer clinics designed to boost confidence, enhance ball control, and improve quick decision-making. For preschool through 4th grade, each session combines fun, fast-paced drills with expert coaching in a supportive environment!</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-the-rfk-fields-1.jpg',
  },
  {
    handle: 'goalkeeping-school', title: 'Goalkeeping School',
    descriptionHtml: '<p>Got a future shot-stopper on your hands? Our Goalkeeping School focuses on everything your child needs to master the art of goalkeeping—agility, strategy, and leadership. It’s where great goalies are made!</p>',
    image: 'https://dcway.com/wp-content/uploads/2025/06/08-22-2023-Brazilian-Summer-camp-2023-0122.jpg',
  },
  {
    handle: 'seaton-after-school-program', title: 'Seaton After-School Program',
    descriptionHtml: '<p>Exclusively for Seaton families, our After-School Program combines soccer skill-building with exciting games. Keep your child active, engaged, and developing a love for soccer, all in a fun and supportive environment!</p>',
    image: 'https://dcway.com/wp-content/uploads/2025/06/11-copy-1.jpg',
  },
  {
    handle: 'private-lessons', title: 'Private Lessons',
    descriptionHtml: '<p>Customized soccer training tailored to your child’s specific needs! Whether it’s one-on-one coaching or small group sessions, our Private Lessons are designed to build skills, confidence, and passion for the game.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/private-lessons.jpg',
  },

  // Page 2
  {
    handle: 'soccer-birthday-party', title: 'Soccer Birthday Party',
    descriptionHtml: '<p>Kick off the best birthday ever with DC Way! Our Soccer Birthday Parties are packed with exciting games, fun drills, and plenty of laughs. Choose a package that suits your celebration and let the fun begin!</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/09/soccer-birthday-party.jpg',
  },
  {
    handle: 'two-rivers-after-school', title: 'Two Rivers After-School',
    descriptionHtml: '<p>Exclusively for Two Rivers families, our After-School Program combines soccer skill-building with exciting games. Keep your child active, engaged, and developing a love for soccer, all in a fun and supportive environment!</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/07/capitol-hill-winter-league-futsal.jpg',
  },
  {
    handle: 'youth-leadership-programs', title: 'Youth Leadership Programs',
    descriptionHtml: '<p>DC Way’s Youth Leadership Programs offer two distinctive tiers to cater to the diverse talents: Counselor-in-Training (ages 12-13) and Junior Assistant (ages 14-18). These programs are open to teens year-round and offer a chance to contribute to DC Way’s vibrant soccer community through camps, Capitol Hill League, and Kids Academy.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/10/dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-chisholm-elementary-school-134.jpg',
  },
  {
    handle: 'dc-way-rising-stars', title: 'DC Way Rising Stars',
    descriptionHtml: '<p>Empowering young athletes through fun, fitness, and foundational skills! Our program introduces children to a variety of exciting sports, fostering physical health, motor skill development, and a lifelong love for athletics—all in a safe and supportive environment.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/08/dc-way-multisport-4-15-and-4-16-0220-copy.jpg',
  },
  {
    handle: 'counselor-in-training', title: 'Counselor-in-Training',
    descriptionHtml: '<p>Our Counselor-in-Training (CIT) program offers children ages 12-13 a unique opportunity to grow their leadership skills and soccer knowledge while mentoring younger players. Join us to become a CIT today!</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/10/dc-way-soccer-club-for-kids-in-washington-dc-counselor-in-training-program-at-tyler-elementary-school.jpeg',
  },
  {
    handle: 'junior-assistant', title: 'Junior Assistant',
    descriptionHtml: '<p>The Junior Assistant Program gives teens ages 14-18 a dynamic opportunity to build leadership skills, assist coaches, and play a vital role in creating fun, engaging soccer sessions. It’s perfect for young leaders eager to learn, support their community, and grow alongside our experienced coaching team.</p>',
    image: 'https://dcway.com/wp-content/uploads/2024/10/dc-way-soccer-club-for-kids-in-washington-dc-summer-camp-at-chisholm-elementary-school-133.jpg',
  },
];

const PROGRAM_TAG = 'program-wp';

// ---- GraphQL queries ----
const PRODUCT_CREATE = `
  mutation ProductCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;
const PRODUCT_UPDATE = `
  mutation ProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;
const PRODUCT_CREATE_MEDIA = `
  mutation CreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { ... on MediaImage { id status } }
      mediaUserErrors { field message }
      userErrors { field message }
    }
  }
`;
const COLLECTION_ADD = `
  mutation CollectionAddProducts($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) {
      collection { id productsCount { count } }
      userErrors { field message }
    }
  }
`;
const COLLECTION_REMOVE = `
  mutation CollectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
    collectionRemoveProducts(id: $id, productIds: $productIds) {
      job { id }
      userErrors { field message }
    }
  }
`;
const COLLECTION_REORDER = `
  mutation CollectionReorder($id: ID!, $moves: [MoveInput!]!) {
    collectionReorderProducts(id: $id, moves: $moves) {
      job { id }
      userErrors { field message }
    }
  }
`;

async function findProductByHandle(handle) {
  const d = await gql(
    `query ($q: String!) { products(first: 1, query: $q) { nodes { id handle title media(first: 1) { nodes { ... on MediaImage { id } } } } } }`,
    { q: `handle:${handle}` }
  );
  return d.products.nodes[0] || null;
}

async function getCollection(handle) {
  const d = await gql(
    `query ($h: String!) { collectionByHandle(handle: $h) { id title productsCount { count } products(first: 50) { nodes { id handle title } } } }`,
    { h: handle }
  );
  return d.collectionByHandle;
}

// ---- main ----
console.log('-> Looking up `programs` collection...');
const programsCollection = await getCollection('programs');
if (!programsCollection) { console.error('programs collection not found'); process.exit(1); }
console.log(`   collection: ${programsCollection.id} (${programsCollection.productsCount.count} products)`);

const existingHandles = new Set(programsCollection.products.nodes.map((p) => p.handle));
const targetHandles = new Set(programs.map((p) => p.handle));
const placeholderRemovals = programsCollection.products.nodes.filter((p) => !targetHandles.has(p.handle));

console.log('\n-> Creating/updating 15 programs...');
const createdIds = [];
for (const spec of programs) {
  let product = await findProductByHandle(spec.handle);
  if (product) {
    // update title + description, ensure draft
    const u = await gql(PRODUCT_UPDATE, {
      product: { id: product.id, title: spec.title, descriptionHtml: spec.descriptionHtml, status: 'DRAFT', tags: ['program', PROGRAM_TAG] },
    });
    if (logErrors(`productUpdate ${spec.handle}`, u.productUpdate.userErrors)) continue;
    console.log(`  ~ updated: ${spec.handle}`);
    // attach image if not already present
    if (product.media?.nodes?.length === 0) {
      const m = await gql(PRODUCT_CREATE_MEDIA, {
        productId: product.id,
        media: [{ alt: spec.title, mediaContentType: 'IMAGE', originalSource: spec.image }],
      });
      logErrors(`media ${spec.handle}`, m.productCreateMedia.userErrors);
      logErrors(`mediaUserErrors ${spec.handle}`, m.productCreateMedia.mediaUserErrors);
    }
  } else {
    const data = await gql(PRODUCT_CREATE, {
      product: {
        title: spec.title, handle: spec.handle, productType: 'Program',
        vendor: 'DC Way Soccer', status: 'DRAFT',
        tags: ['program', PROGRAM_TAG],
        descriptionHtml: spec.descriptionHtml,
      },
      media: [{ alt: spec.title, mediaContentType: 'IMAGE', originalSource: spec.image }],
    });
    if (logErrors(`productCreate ${spec.handle}`, data.productCreate.userErrors)) continue;
    product = data.productCreate.product;
    console.log(`  + created: ${spec.handle}`);
  }
  createdIds.push(product.id);
}

console.log('\n-> Ensuring all 15 are in the programs collection...');
const toAdd = createdIds.filter((id) => {
  const handle = programs.find((p) => createdIds.indexOf(id) === programs.indexOf(p))?.handle;
  return !existingHandles.has(handle);
});
if (toAdd.length > 0) {
  const a = await gql(COLLECTION_ADD, { id: programsCollection.id, productIds: createdIds });
  logErrors('collectionAddProducts', a.collectionAddProducts.userErrors);
  console.log(`  added/ensured ${createdIds.length} products`);
}

console.log('\n-> Reordering collection to WP display order (manual sort required for custom order)...');
// Note: this requires the collection sort to be MANUAL. We attempt the reorder; if it errors, the user must set the collection sort order to "Manually" in admin.
const moves = createdIds.map((id, idx) => ({ id, newPosition: String(idx) }));
const r = await gql(COLLECTION_REORDER, { id: programsCollection.id, moves });
if (r.collectionReorderProducts.userErrors?.length) {
  console.warn('  (!) reorder failed — open admin -> Collections -> Programs -> set sort order to "Manually", then re-run.');
  console.warn(JSON.stringify(r.collectionReorderProducts.userErrors, null, 2));
} else {
  console.log('  reorder job queued');
}

if (placeholderRemovals.length > 0) {
  console.log(`\n-> Removing ${placeholderRemovals.length} placeholder product(s) from collection (products are kept, just unlinked):`);
  for (const p of placeholderRemovals) console.log(`   - ${p.handle}`);
  const rm = await gql(COLLECTION_REMOVE, { id: programsCollection.id, productIds: placeholderRemovals.map((p) => p.id) });
  logErrors('collectionRemoveProducts', rm.collectionRemoveProducts.userErrors);
}

console.log('\n-> Done. Verify in admin: Products / Collections / Programs.');
