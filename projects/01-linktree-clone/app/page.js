import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  // 이미 로그인했다면 대시보드로 가는 버튼을, 아니면 가입/로그인 버튼을 보여준다.
  const user = await getCurrentUser();

  return (
    <div className="card">
      <h1>My Links</h1>
      <p className="muted">여러 개의 링크를 한 페이지에 모아서 보여주세요.</p>
      {user ? (
        <p>
          <Link href="/dashboard" className="button">
            내 링크 관리하기
          </Link>
        </p>
      ) : (
        <p>
          <Link href="/signup" className="button">
            회원가입
          </Link>{" "}
          <Link href="/login">로그인</Link>
        </p>
      )}
    </div>
  );
}
