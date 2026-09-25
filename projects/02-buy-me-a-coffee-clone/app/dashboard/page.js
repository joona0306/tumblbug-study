import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { getPaidSupportsForCreator, getSupportSummary } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { formatDate, formatWon } from "@/lib/support";
import BioForm from "./bio-form";

export default async function DashboardPage() {
  // 로그인하지 않은 사람은 이 줄에서 /login 으로 보내지고, 아래 코드는 실행되지 않는다.
  const user = await requireUser();

  // "나"에게 온 후원만 가져온다 (user.id 로 거른다)
  const summary = await getSupportSummary(user.id);
  const supports = await getPaidSupportsForCreator(user.id);

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
        <div className="stats">
          <div>
            <span className="muted small">받은 후원</span>
            <strong>{formatWon(summary.total)}</strong>
          </div>
          <div>
            <span className="muted small">후원 건수</span>
            <strong>{summary.supporters}건</strong>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>받은 후원</h2>
        {supports.length === 0 ? (
          <p className="muted">아직 받은 후원이 없어요. 내 후원 페이지 주소를 SNS에 공유해보세요.</p>
        ) : (
          <ul className="support-list">
            {supports.map((item) => (
              <li key={item.id}>
                <div className="row spread">
                  <strong>
                    {item.supporterName} · {formatWon(item.amount)}
                  </strong>
                  <span className="muted small">{formatDate(item.paidAt)}</span>
                </div>
                {item.message && <p>{item.message}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>프로필</h2>
        <BioForm currentBio={user.bio} />
      </div>
    </div>
  );
}
