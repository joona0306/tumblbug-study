import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  // 로그인하지 않은 사람은 이 줄에서 /login 으로 보내지고, 아래 코드는 실행되지 않는다.
  const user = await requireUser();

  return (
    <div className="card">
      <div className="row spread">
        <h1>내 판매 상품</h1>
        <form action={signOut}>
          <button type="submit" className="secondary">
            로그아웃
          </button>
        </form>
      </div>
      <p>
        안녕하세요, <strong>{user.username}</strong>님!
      </p>
    </div>
  );
}
