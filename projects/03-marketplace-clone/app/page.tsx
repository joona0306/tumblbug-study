import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export default async function Home() {
  // 이미 로그인했다면 대시보드로 가는 버튼을, 아니면 가입/로그인 버튼을 보여준다.
  const user = await getCurrentUser();

  return (
    <div className="card">
      <h1>🥕 동네 마켓</h1>
      <p className="muted">안 쓰는 물건을 올리고, 필요한 물건을 찾아보세요.</p>
      {user ? (
        <p>
          <Link href="/dashboard" className="button">
            내 판매 상품
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
