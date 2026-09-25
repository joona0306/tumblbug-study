// 다른 파일에서 가져다 쓸 수 있도록 "내보내는(export)" 함수들

// 이름을 받아서 인사말 문장을 돌려준다
export function makeGreeting(name) {
  return `안녕하세요, ${name}님!`;
}

// 0.5초 뒤에 링크 목록을 돌려준다.
// (인터넷으로 DB에 물어보는 것처럼 "시간이 걸리는 일"을 흉내 낸 것)
export function fetchFakeLinks() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { title: "유튜브", url: "https://youtube.com" },
        { title: "인스타", url: "https://instagram.com" },
      ]);
    }, 500);
  });
}
