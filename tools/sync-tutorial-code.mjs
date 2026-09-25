// 교재 작성자용 도구 (독자는 실행할 필요 없음)
//
// HTML 교재의 코드 블록을 "검증된 정답 코드"의 git 태그 시점 내용으로 채워 넣는다.
// 그래서 교재에 보이는 코드 = 실제로 실행해서 확인한 코드 가 항상 같게 유지된다.
//
// 사용법 (저장소 최상위 폴더에서):
//   node tools/sync-tutorial-code.mjs docs/01-linktree-clone/tutorial projects/01-linktree-clone
//
// HTML 안의 코드 블록 형식:
//   <figure class="code" data-src="app/page.js" data-tag="linktree-week2-step4" data-lines="10-20">
//     <figcaption><span class="label">app/page.js</span></figcaption>
//     <pre><code>(이 부분이 자동으로 채워짐)</code></pre>
//   </figure>
//   - data-lines 는 선택. 파일의 일부 줄만 보여줄 때 사용 (1부터 시작, 양 끝 포함)
//
// 또한 모든 HTML의 data-task 를 모아 app.js 의 TASKS 목록을 갱신한다.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [tutorialDir, projectDir] = process.argv.slice(2);
if (!tutorialDir || !projectDir) {
  console.error("사용법: node tools/sync-tutorial-code.mjs <교재 폴더> <정답 코드 폴더>");
  process.exit(1);
}

const escapeHtml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function readAtTag(tag, file) {
  const path = `${projectDir.replace(/\\/g, "/").replace(/\/$/, "")}/${file}`;
  try {
    return execFileSync("git", ["show", `${tag}:${path}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  } catch {
    throw new Error(`git show ${tag}:${path} 실패 — 태그나 파일 경로를 확인하세요`);
  }
}

const figurePattern =
  /(<figure class="code"[^>]*?data-src="([^"]+)"[^>]*?data-tag="([^"]+)"(?:[^>]*?data-lines="([^"]+)")?[^>]*>[\s\S]*?<pre><code>)[\s\S]*?(<\/code><\/pre>)/g;

const htmlFiles = readdirSync(tutorialDir).filter((name) => name.endsWith(".html"));
const tasks = {};
let blockCount = 0;

for (const name of htmlFiles) {
  const filePath = join(tutorialDir, name);
  const original = readFileSync(filePath, "utf8");

  const updated = original.replace(figurePattern, (match, head, src, tag, lines, tail) => {
    let content = readAtTag(tag, src);
    if (lines) {
      const [from, to] = lines.split("-").map(Number);
      content = content.split("\n").slice(from - 1, to).join("\n") + "\n";
    }
    blockCount++;
    return head + escapeHtml(content.replace(/\n$/, "")) + tail;
  });

  if (updated !== original) {
    writeFileSync(filePath, updated);
  }

  const page = basename(name, ".html");
  const ids = [...updated.matchAll(/data-task="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) {
    throw new Error(`${name}: data-task 중복 — ${duplicates.join(", ")}`);
  }
  if (ids.length) tasks[page] = ids;
}

const appPath = join(tutorialDir, "app.js");
const app = readFileSync(appPath, "utf8");
const block = `/* TASKS:START */\n  var TASKS = ${JSON.stringify(tasks, null, 2).replace(/\n/g, "\n  ")};\n  /* TASKS:END */`;
writeFileSync(appPath, app.replace(/\/\* TASKS:START \*\/[\s\S]*?\/\* TASKS:END \*\//, block));

const totalTasks = Object.values(tasks).reduce((sum, ids) => sum + ids.length, 0);
console.log(`코드 블록 ${blockCount}개 동기화, 체크 항목 ${totalTasks}개 (${Object.keys(tasks).join(", ")})`);
