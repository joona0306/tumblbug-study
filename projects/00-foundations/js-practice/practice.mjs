// 실행: 터미널에서 node practice.mjs
// 다른 파일(utils.mjs)에서 내보낸 함수를 "가져오기(import)"
import { fetchFakeLinks, makeGreeting } from "./utils.mjs";

// 1. 변수: const 는 바뀌지 않는 값, let 은 바뀔 수 있는 값
const name = "김코딩";
let count = 0;
count = count + 1;
console.log("1.", name, count);

// 2. 함수 호출 + 템플릿 문자열(백틱 ` 안에 ${변수})
console.log("2.", makeGreeting(name));

// 3. 객체: 여러 정보를 이름표(키)를 붙여 한 덩어리로 묶기
const user = { username: "kimcoding", email: "kim@example.com" };
console.log("3.", user.username);

// 4. 배열과 map: 목록의 항목 하나하나를 바꿔서 새 목록 만들기
const titles = ["유튜브", "인스타", "블로그"];
const labels = titles.map((title, index) => `${index + 1}번째 링크: ${title}`);
console.log("4.", labels);

// 5. if / else: 조건에 따라 다른 일 하기
const MAX_LINKS = 3;
if (titles.length >= MAX_LINKS) {
  console.log("5. 링크가 꽉 찼어요");
} else {
  console.log("5. 링크를 더 추가할 수 있어요");
}

// 6. async / await: 시간이 걸리는 일이 끝날 때까지 기다렸다가 결과 받기
async function main() {
  console.log("6. 링크를 불러오는 중...");
  const links = await fetchFakeLinks();
  console.log("6. 불러온 링크 개수:", links.length);

  // 7. try / catch: 에러가 나도 프로그램이 멈추지 않게 붙잡기
  try {
    new URL("주소가 아님");
  } catch (error) {
    console.log("7. 잘못된 주소라서 에러가 났어요:", error.code);
  }
}

main();
