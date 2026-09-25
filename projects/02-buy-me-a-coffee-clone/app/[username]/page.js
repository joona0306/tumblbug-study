import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";

// 주소창의 /사용자이름 에서 크리에이터를 찾는다. (사용자 이름은 소문자로 저장되어 있다)
// 공개 페이지이므로 이메일 같은 개인정보는 가져오지 않는다.
async function findCreator(params) {
  const { username } = await params;
  const [found] = await db
    .select({
      id: user.id,
      username: user.username,
      displayUsername: user.displayUsername,
      bio: user.bio,
    })
    .from(user)
    .where(eq(user.username, username.toLowerCase()));
  return found;
}

export async function generateMetadata({ params }) {
  const creator = await findCreator(params);
  return {
    title: creator ? `${creator.displayUsername ?? creator.username}에게 커피 한 잔 ☕` : "크리에이터를 찾을 수 없음",
  };
}

export default async function CreatorPage({ params }) {
  const creator = await findCreator(params);
  if (!creator) {
    notFound();
  }

  return (
    <div className="stack">
      <div className="card profile">
        <h1>@{creator.displayUsername ?? creator.username}</h1>
        <p className="muted">{creator.bio || "아직 소개가 없어요."}</p>
      </div>
    </div>
  );
}
