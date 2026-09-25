// 운영 점검 도구: 저장소(Vercel Blob)에는 있는데 DB 의 어떤 상품도 쓰지 않는 사진(= 고아 사진)을 찾는다.
// 사진을 올린 뒤 DB 저장이 실패했거나, 코드 실수로 옛 사진을 안 지웠을 때 생긴다. 쌓이면 저장 용량만 차지한다.
//
// 사용법 (프로젝트 폴더에서):
//   node --env-file=.env.local scripts/check-orphan-images.mjs            ← 찾기만 한다
//   node --env-file=.env.local scripts/check-orphan-images.mjs --delete   ← 찾아서 지운다
import { del, list } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";

const shouldDelete = process.argv.includes("--delete");

// 1. 저장소의 사진 목록 (한 번에 최대 1000개씩 오므로 cursor 로 끝까지 받는다)
const blobs = [];
let cursor;
do {
  const page = await list({ prefix: "products/", cursor });
  blobs.push(...page.blobs);
  cursor = page.cursor;
} while (cursor);

// 2. DB 가 쓰고 있는 사진 주소
const rows = await neon(process.env.DATABASE_URL).query("SELECT image_url FROM product");
const used = new Set(rows.map((row) => row.image_url));

// 3. 비교
const orphans = blobs.filter((blob) => !used.has(blob.url));
const totalKB = (blobs.reduce((sum, blob) => sum + blob.size, 0) / 1024).toFixed(0);
console.log(`저장소 사진 ${blobs.length}개 (${totalKB}KB) / DB 상품 ${rows.length}개 / 고아 사진 ${orphans.length}개`);
for (const blob of orphans) {
  console.log(`  - ${blob.pathname} (${(blob.size / 1024).toFixed(0)}KB, 올린 날 ${blob.uploadedAt.toISOString().slice(0, 10)})`);
}

if (shouldDelete && orphans.length > 0) {
  await del(orphans.map((blob) => blob.url));
  console.log(`고아 사진 ${orphans.length}개를 지웠습니다.`);
}
