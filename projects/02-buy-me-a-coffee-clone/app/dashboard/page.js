import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/session";
import BioForm from "./bio-form";

export default async function DashboardPage() {
  // 로그인하지 않은 사람은 이 줄에서 /login 으로 보내지고, 아래 코드는 실행되지 않는다.
  const user = await requireUser();

  return (
    <div className="stack">
      <div className="card">
        <div className="row spread">
          <h1>크리에이터 대시보드</h1>
          <form action={signOut}>
            <button type="submit" className="secondary">
              로그아웃
            </button>
          </form>
        </div>
        <p className="muted">
          내 후원 페이지: <Link href={`/${user.username}`}>/{user.username}</Link>
        </p>
      </div>

      <div className="card">
        <h2>프로필</h2>
        <BioForm currentBio={user.bio} />
      </div>
    </div>
  );
}
