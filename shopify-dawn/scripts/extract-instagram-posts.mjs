// Parse WP HTML to extract paired Instagram post URLs + thumbnail filenames.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dirname, '..', '..', 'wordpress-reference', '03-saved-html-pages', '01-home-main', 'DC Way Soccer.html');
const html = readFileSync(HTML, 'utf8');

const re = /<div class="sbi_item[^"]*sbi_type_(image|video)"[^>]*>[\s\S]*?<a class="sbi_photo" href="(https:\/\/www\.instagram\.com\/[^"]+)"[\s\S]*?<img[^>]*src="\.\/DC Way Soccer_files\/([^"]+\.webp)"[^>]*alt="([^"]*)/g;

const out = [];
let m;
while ((m = re.exec(html)) !== null) {
  out.push({ type: m[1], url: m[2], thumb: m[3], alt: m[4].substring(0, 100) });
}
console.log(JSON.stringify(out, null, 2));
console.log('TOTAL:', out.length);
