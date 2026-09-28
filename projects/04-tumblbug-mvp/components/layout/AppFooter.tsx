import Link from "next/link";
import styles from "./AppFooter.module.css";

// 모든 화면 아래 (17주차 — 실제 사용자를 받기 시작하면서)
//  - 학습용 서비스라는 안내 (위쪽 띠 StudyNotice 와 같은 내용을 한 번 더)
//  - 개인정보 처리 안내 · 의견 보내기
// 의견 보내기 주소는 환경 변수 NEXT_PUBLIC_FEEDBACK_URL (Google 설문지 주소). 비어 있으면 링크를 숨긴다
export function AppFooter() {
  const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <p className="text-caption text-muted">모아는 크라우드펀딩 교재의 예시 서비스예요. 결제는 모두 테스트라 실제로 돈이 나가지 않아요.</p>
        <nav className={styles.links} aria-label="서비스 안내">
          <Link href="/privacy" className="text-caption">
            개인정보 처리 안내
          </Link>
          {feedbackUrl && (
            // 바깥 사이트(Google 설문지)는 새 탭으로. noopener: 새 탭이 우리 창을 건드리지 못하게
            <a href={feedbackUrl} target="_blank" rel="noopener noreferrer" className="text-caption">
              의견 보내기<span className="sr-only"> (새 탭에서 열림)</span>
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
