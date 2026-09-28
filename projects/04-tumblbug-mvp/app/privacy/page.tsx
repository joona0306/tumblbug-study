import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "개인정보 처리 안내 — 모아" };

// 개인정보 처리 안내 (17주차) — 실제 사람의 이메일·이름·배송지를 받기 시작하므로 "무엇을, 왜, 누가, 언제까지"를 알린다
// 학습용 서비스의 안내문이다 (법률 검토를 받은 약관이 아니다). 실제 서비스라면 법에 맞는 개인정보처리방침이 필요하다
// 내용은 코드가 실제로 저장하는 것과 같아야 한다 — 새로 저장하는 값이 생기면 이 화면도 함께 고친다
export default function PrivacyPage() {
  const feedbackUrl = process.env.NEXT_PUBLIC_FEEDBACK_URL;
  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-l">개인정보 처리 안내</h1>
      <p className="text-body-m text-muted">
        모아는 크라우드펀딩 교재를 따라 만든 <strong>학습용 서비스</strong>예요. 결제는 모두 테스트라 실제로 돈이 나가지 않아요. 오프라인 스터디에서 운영을 연습하는 동안만 운영해요.
      </p>

      <section>
        <h2 className="text-heading-m">무엇을 저장하나요</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">언제</th>
              <th scope="col">저장하는 것</th>
              <th scope="col">왜</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>가입할 때</td>
              <td>이메일, 아이디, 이름, 비밀번호(암호화해서 — 운영자도 볼 수 없어요)</td>
              <td>로그인, 후원 내역·프로젝트를 내 계정에 연결</td>
            </tr>
            <tr>
              <td>로그인할 때</td>
              <td>로그인 기록(접속 IP, 브라우저 종류)</td>
              <td>로그인 유지, 이상한 접속 확인</td>
            </tr>
            <tr>
              <td>배송이 필요한 리워드로 후원할 때</td>
              <td>받는 사람 이름, 연락처, 주소</td>
              <td>창작자가 리워드를 보내기 위해</td>
            </tr>
            <tr>
              <td>후원할 때</td>
              <td>후원 금액, 응원 메시지, 테스트 결제 기록</td>
              <td>후원 내역, 모금액 계산</td>
            </tr>
            <tr>
              <td>프로젝트를 올릴 때</td>
              <td>프로젝트 내용과 사진</td>
              <td>프로젝트를 보여 주기 위해 (누구나 볼 수 있어요)</td>
            </tr>
            <tr>
              <td>화면을 볼 때</td>
              <td>브라우저 쿠키의 무작위 값(방문자 구분), 화면 테마 설정</td>
              <td>&ldquo;상세를 본 사람 중 몇 명이 후원했나&rdquo; 통계 — 계정·IP 와 연결하지 않아요</td>
            </tr>
            <tr>
              <td>요청이 너무 많을 때</td>
              <td>접속 IP (하루가 지나면 지워요)</td>
              <td>짧은 시간에 요청을 너무 많이 보내는 것 막기</td>
            </tr>
          </tbody>
        </table>
        <p className="text-body-s text-muted">
          <strong>배송지는 실제 주소가 아니어도 돼요.</strong> 테스트 후원이라 실제로 물건이 가지 않는다면 가짜 주소를 적어 주세요. 카드 번호 같은 결제 정보는 모아가 받지 않아요 (토스페이먼츠 테스트 결제창에서 처리해요).
        </p>
      </section>

      <section>
        <h2 className="text-heading-m">누가 볼 수 있나요</h2>
        <ul className={styles.list}>
          <li>배송지는 <strong>그 프로젝트의 창작자만</strong> 볼 수 있어요. 다른 사용자는 볼 수 없어요.</li>
          <li>운영자(스터디 진행자)는 서비스 운영과 문제 해결을 위해 데이터베이스를 볼 수 있어요.</li>
          <li>에러 기록(Sentry)에는 이름·이메일·쿠키·입력한 내용을 보내지 않도록 설정했어요.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-heading-m">어디에 보관하나요</h2>
        <ul className={styles.list}>
          <li>데이터베이스: Neon (싱가포르 서버)</li>
          <li>화면·서버: Vercel · 프로젝트 사진: Vercel Blob</li>
          <li>에러 기록: Sentry · 테스트 결제: 토스페이먼츠 (테스트 모드)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-heading-m">언제까지 보관하나요</h2>
        <ul className={styles.list}>
          <li><strong>스터디가 끝나면 모든 계정과 후원 기록을 지워요.</strong></li>
          <li>그 전이라도 지워 달라고 하면 바로 지워요. 아직 &ldquo;탈퇴&rdquo; 버튼이 없어서 운영자에게 알려 주세요.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-heading-m">문의·삭제 요청</h2>
        {feedbackUrl ? (
          <p className="text-body-m">
            스터디 진행자에게 직접 말하거나{" "}
            <a href={feedbackUrl} target="_blank" rel="noopener noreferrer">
              의견 보내기<span className="sr-only"> (새 탭에서 열림)</span>
            </a>
            로 알려 주세요.
          </p>
        ) : (
          <p className="text-body-m">스터디 진행자에게 직접 알려 주세요.</p>
        )}
      </section>

      <p className="text-caption text-muted">마지막 수정: 2026-09-28 · 학습용 안내문이며 법률 검토를 받은 약관이 아니에요.</p>
    </main>
  );
}
