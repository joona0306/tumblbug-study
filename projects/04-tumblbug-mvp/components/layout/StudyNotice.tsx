import styles from "./StudyNotice.module.css";

// 모든 화면 맨 위의 얇은 안내 띠 (17주차) — 처음 온 사람이 진짜 결제 서비스로 오해하지 않게
// 결제 화면에도 같은 안내가 있지만(ConfirmStep), 가입·프로젝트 등록 전에 먼저 알아야 한다
export function StudyNotice() {
  return (
    <p className={styles.notice} role="note">
      학습용 서비스예요 · 결제는 모두 <strong>테스트</strong>라 실제로 돈이 나가지 않아요
    </p>
  );
}
