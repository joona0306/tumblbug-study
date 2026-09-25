import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  // 이미 로그인했다면 대시보드로 가는 버튼을, 아니면 가입/로그인 버튼을 보여준다.
  const user = await getCurrentUser();

  return (
    <div className="card">
      <h1>☕ Buy Me a Coffee</h1>
      <p className="muted">커피 한 잔 값으로 좋아하는 크리에이터를 응원하세요. 크리에이터라면 가입하고 내 후원 페이지를 만드세요.</p>
      {user ? (
        <p>
          <Link href="/dashboard" className="button">
            내 대시보드
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
