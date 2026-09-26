// 5주차 1단계: 토큰이 제대로 들어갔는지 확인하는 임시 첫 화면.
// 8주차에 Figma 시안대로 진짜 홈 화면으로 바꾼다.
export default function Home() {
  return (
    <main className="container" style={{ paddingBlock: "var(--spacing-3xl)" }}>
      <p className="text-label" style={{ color: "var(--color-primary)" }}>
        준비 중
      </p>
      <h1 className="text-display">작은 응원이 모여 창작이 돼요</h1>
      <p className="text-body-m text-muted" style={{ marginTop: "var(--spacing-md)" }}>
        모아는 창작자의 프로젝트를 후원하는 크라우드펀딩 서비스입니다.
      </p>
    </main>
  );
}
