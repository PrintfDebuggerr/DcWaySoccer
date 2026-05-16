// Bootstrap the DC Way blog from WordPress reference.
//
// What this does:
//   1. Uploads the decorative panda mascot (pandd PNG) to Shopify Files
//      as dcway-blog-mascot.png (used by the dcway-blog section).
//   2. Uploads the 6 WP blog post featured images to Shopify Files.
//   3. Creates 6 articles in the `news` blog with WP-faithful title +
//      excerpt + featured image.
//
// Idempotent: skips images/articles whose handle/filename already exists.
//
// Run: node scripts/admin-bootstrap-blog.mjs

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
const REST = (path) => `https://${env.SHOPIFY_STORE}/admin/api/${env.SHOPIFY_API_VERSION}/${path}`;
const REF = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '01-home-main', 'DC Way Soccer_files');

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

// ---------- Image upload ----------
const STAGED_UPLOADS = `
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
      files { id fileStatus alt ... on MediaImage { image { url } } }
      userErrors { field message }
    }
  }
`;
const FILE_BY_ID = `
  query($id: ID!) {
    node(id: $id) { ... on MediaImage { id fileStatus image { url } } }
  }
`;
const FILE_BY_ALIAS = `
  query($q: String!) {
    files(first: 1, query: $q) { nodes { id ... on MediaImage { image { url } } } }
  }
`;

async function findExistingFile(alias) {
  const data = await gql(FILE_BY_ALIAS, { q: `filename:${alias}` });
  return data.files.nodes[0] || null;
}

async function uploadImage(spec) {
  const existing = await findExistingFile(spec.alias);
  if (existing?.image?.url) {
    console.log(`  = ${spec.alias} already uploaded: ${existing.image.url}`);
    return { id: existing.id, url: existing.image.url };
  }
  const size = statSync(spec.file).size;
  console.log(`\n-> ${spec.alias} (${(size / 1024).toFixed(0)} KB)`);
  const staged = await gql(STAGED_UPLOADS, {
    input: [{
      filename: spec.alias,
      mimeType: spec.mime,
      httpMethod: 'POST',
      resource: 'IMAGE',
      fileSize: String(size),
    }],
  });
  if (logErrors('stagedUploadsCreate', staged.stagedUploadsCreate.userErrors)) return null;
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const body = new FormData();
  for (const p of target.parameters) body.append(p.name, p.value);
  body.append('file', new Blob([readFileSync(spec.file)], { type: spec.mime }), spec.alias);
  const putRes = await fetch(target.url, { method: 'POST', body });
  if (!putRes.ok) { console.error(`  x upload POST ${putRes.status}: ${await putRes.text()}`); return null; }

  const fc = await gql(FILE_CREATE, {
    files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt: spec.alt }],
  });
  if (logErrors('fileCreate', fc.fileCreate.userErrors)) return null;
  const file = fc.fileCreate.files[0];

  let final = file;
  for (let i = 0; i < 12 && final.fileStatus !== 'READY'; i++) {
    await new Promise((res) => setTimeout(res, 1500));
    const r = await gql(FILE_BY_ID, { id: file.id });
    final = r.node;
    if (!final) break;
  }
  if (final?.fileStatus !== 'READY') {
    console.error(`  ! status: ${final?.fileStatus} (not READY)`);
  } else {
    console.log(`  + ready: ${final.image.url}`);
  }
  return { id: final.id, url: final?.image?.url || null };
}

// ---------- Article creation (REST is simpler than GraphQL for articles) ----------
async function findArticle(blogId, handle) {
  const r = await fetch(REST(`blogs/${blogId}/articles.json?handle=${handle}&limit=1`), {
    headers: { 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
  });
  const j = await r.json();
  return j.articles?.[0] || null;
}

async function createArticle(blogId, article) {
  const existing = await findArticle(blogId, article.handle);
  if (existing) {
    console.log(`  = article already exists: ${article.handle} (id=${existing.id})`);
    return existing;
  }
  const payload = {
    article: {
      title: article.title,
      handle: article.handle,
      author: article.author || 'DC Way Soccer',
      tags: 'blog',
      published: true,
      body_html: article.body_html,
      summary_html: article.summary_html,
      image: article.image_src ? { src: article.image_src } : undefined,
    },
  };
  const r = await fetch(REST(`blogs/${blogId}/articles.json`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.article) { console.error(`  x article create failed:`, j); return null; }
  console.log(`  + article created: ${article.handle} (id=${j.article.id})`);
  return j.article;
}

// ---------- Data ----------
const mascotSpec = {
  key: 'mascot',
  file: join(REF, 'pandd-rbnux2u3jb7a1lj1wk2ur021sejfpeue7044ool00k.png'),
  alias: 'dcway-blog-mascot.png',
  mime: 'image/png',
  alt: 'DC Way Soccer panda mascot',
};

const articles = [
  {
    handle: 'why-futsal-is-the-secret-weapon-for-youth-soccer-development',
    title: 'Why Futsal is the Secret Weapon for Youth Soccer Development',
    image_file: 'DCWay-FutsalBlog.png',
    image_alias: 'dcway-blog-futsal.png',
    image_mime: 'image/png',
    excerpt: "If your child is playing indoor soccer this winter and you're wondering why they're using a smaller, heavier ball on a basketball court instead of running around on grass, you're not alone. Welcome to futsal, and it might be the best thing that ever happened to your young player's development.",
  },
  {
    handle: 'from-fun-to-futsal-dc-ways-winter-soccer-journey',
    title: "From Fun to Futsal: DC Way's Winter Soccer Journey",
    image_file: 'DSC06354-768x512.jpg',
    image_alias: 'dcway-blog-winter-journey.jpg',
    image_mime: 'image/jpeg',
    excerpt: "Winter doesn't mean soccer stops — it just takes on a whole new rhythm! At DC Way, we're bringing the game indoors with a lineup of exciting futsal-based programs designed for every age and skill level. From fun one-day tournaments to structured training and competitive play, there's something for every young player to stay active, build confidence, and keep loving the game all winter long.",
  },
  {
    handle: 'how-board-games-and-sports-build-young-minds',
    title: 'How Board Games and Sports Work Together to Build Young Minds',
    image_file: 'DCWAY-AfterSchoolProgram-HillCenter-768x512.png',
    image_alias: 'dcway-blog-after-school.png',
    image_mime: 'image/png',
    excerpt: "When most families think about after-school programs, they picture soccer drills, art projects, or maybe LEGO building. But what about board games? At DC Way's After-School Program at the Historic Hill Center, we're excited to show families how board games and sports actually go hand in hand when it comes to helping children grow.",
  },
  {
    handle: '5-ways-fall-soccer-builds-more-than-just-skills',
    title: '5 Ways Fall Soccer Builds More Than Just Skills',
    image_file: 'DCWay-768x512.png',
    image_alias: 'dcway-blog-fall-soccer.png',
    image_mime: 'image/png',
    excerpt: "At DC Way, we know that fall soccer is about so much more than learning how to dribble or score a goal. Every time your child steps onto the field, they're building life skills that will stay with them long after the game ends.",
  },
  {
    handle: 'why-our-hill-center-after-school-program-is-the-perfect-mix-of-fun-and-learning',
    title: 'Why Our Hill Center After-School Program Is the Perfect Mix of Fun and Learning',
    image_file: 'Hill-Center-After-School-e1759143832866.png',
    image_alias: 'dcway-blog-hill-center.png',
    image_mime: 'image/png',
    excerpt: "Have you ever wondered what makes the hours after school so important? For children, this time is more than just filling the gap between the classroom and dinner — it's a chance to learn, play, grow, and discover who they are in new ways.",
  },
  {
    handle: 'which-soccer-path-is-right-for-your-child-this-fall',
    title: 'Which Soccer Path is Right for Your Child This Fall?',
    image_file: 'DCWay-Capitol-Hill-League-Kids-Academy-Challenge-Level-768x512.png',
    image_alias: 'dcway-blog-soccer-path.png',
    image_mime: 'image/png',
    excerpt: "Fall is here, and it's the perfect time to set your child up for success both on and off the field. At DC Way, our programs are designed to grow with your player — from their very first introduction to sports to their first taste of competition.",
  },
];

// ---------- Main ----------
console.log('=== Uploading mascot ===');
const mascotResult = await uploadImage(mascotSpec);
console.log(`mascot: ${mascotResult?.url || '(failed)'}\n`);

console.log('=== Uploading blog images ===');
const imageMap = {};
for (const art of articles) {
  const result = await uploadImage({
    file: join(REF, art.image_file),
    alias: art.image_alias,
    mime: art.image_mime,
    alt: art.title,
  });
  imageMap[art.image_alias] = result?.url || null;
}

console.log('\n=== Locating news blog ===');
const blogsRes = await fetch(REST('blogs.json'), {
  headers: { 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
});
const blogsJson = await blogsRes.json();
const newsBlog = blogsJson.blogs.find((b) => b.handle === 'news') || blogsJson.blogs[0];
if (!newsBlog) { console.error('No blog found'); process.exit(1); }
console.log(`news blog: id=${newsBlog.id} handle=${newsBlog.handle}`);

console.log('\n=== Creating articles ===');
for (const art of articles) {
  const imgUrl = imageMap[art.image_alias];
  const bodyHtml = `<p>${art.excerpt}</p>`;
  await createArticle(newsBlog.id, {
    title: art.title,
    handle: art.handle,
    image_src: imgUrl,
    body_html: bodyHtml,
    summary_html: `<p>${art.excerpt}</p>`,
  });
}

console.log('\nDone.');
