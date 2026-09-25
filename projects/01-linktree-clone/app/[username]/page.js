import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { link, user } from "@/db/schema";

// 주소창의 /사용자이름 에서 사용자를 찾는다. (사용자 이름은 소문자로 저장되어 있다)
async function findUser(params) {
  const { username } = await params;
  const [found] = await db
    .select({ id: user.id, username: user.username, displayUsername: user.displayUsername })
    .from(user)
    .where(eq(user.username, username.toLowerCase()));
  return found;
}

// 브라우저 탭에 보일 제목
export async function generateMetadata({ params }) {
  const owner = await findUser(params);
  return { title: owner ? `${owner.displayUsername ?? owner.username}의 링크` : "사용자를 찾을 수 없음" };
}

export default async function PublicPage({ params }) {
  const owner = await findUser(params);

  // 없는 사용자면 404(찾을 수 없음) 페이지를 보여준다.
  if (!owner) {
    notFound();
  }

  const links = await db
    .select({ id: link.id, title: link.title, url: link.url })
    .from(link)
    .where(eq(link.userId, owner.id))
    .orderBy(asc(link.position), asc(link.id));

  return (
    <div className="public-page">
      <h1>@{owner.displayUsername ?? owner.username}</h1>
      {links.length === 0 ? (
        <p className="muted">아직 등록된 링크가 없어요.</p>
      ) : (
        <ul className="public-links">
          {links.map((item) => (
            <li key={item.id}>
              {/* 새 탭에서 열기. noopener: 열린 사이트가 이 페이지를 조작하지 못하게 막는다 */}
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="public-link">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
