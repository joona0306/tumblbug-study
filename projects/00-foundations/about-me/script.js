// 1. 지금 시각에 맞는 인사말 보여주기
const hour = new Date().getHours(); // 0 ~ 23

let greeting;
if (hour < 12) {
  greeting = "좋은 아침이에요 ☀️";
} else if (hour < 18) {
  greeting = "좋은 오후예요 🌤️";
} else {
  greeting = "좋은 저녁이에요 🌙";
}

// HTML에서 id="greeting" 인 요소를 찾아 글자를 바꾼다
document.querySelector("#greeting").textContent = greeting;

// 2. 버튼을 누르면 다크 모드 켜고 끄기
const button = document.querySelector("#theme-button");

button.addEventListener("click", () => {
  // body 에 "dark" 클래스가 없으면 붙이고, 있으면 뗀다
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");
  button.textContent = isDark ? "☀️ 라이트 모드로" : "🌙 다크 모드로";
});
