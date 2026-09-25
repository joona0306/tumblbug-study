import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { link } from "@/db/schema";
import { MAX_LINKS } from "@/lib/links";
import { requireUser } from "@/lib/session";
import LinkForm from "./link-form";

export default async function DashboardPage() {
  // 로그인하지 않은 사람은 이 줄에서 /login 으로 보내지고, 아래 코드는 실행되지 않는다.
  const user = await requireUser();

  // 내 링크만, position 순서대로 가져온다.
  const links = await db
    .select()
    .from(link)
    .where(eq(link.userId, user.id))
    .orderBy(asc(link.position), asc(link.id));

  return (
    <div className="stack">
      <div className="card">
        <h1>내 링크 관리</h1>
        <p className="muted">
          공개 페이지: <Link href={`/${user.username}`}>/{user.username}</Link>
        </p>
        <p className="muted small">
          {links.length} / {MAX_LINKS}개 사용 중
        </p>
        {links.length === 0 ? (
          <p className="muted">아직 링크가 없어요. 아래에서 첫 링크를 추가해보세요.</p>
        ) : (
          <ul className="link-list">
            {links.map((item) => (
              <li key={item.id} className="link-item">
                <div>
                  <strong>{item.title}</strong>
                  <div className="muted small">{item.url}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>새 링크 추가</h2>
        {links.length >= MAX_LINKS ? (
          <p className="muted">무료 버전은 링크를 {MAX_LINKS}개까지 만들 수 있어요.</p>
        ) : (
          <LinkForm />
        )}
      </div>
    </div>
  );
}
