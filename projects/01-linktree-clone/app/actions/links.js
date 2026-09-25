"use server";

import { and, count, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { link } from "@/db/schema";
import { MAX_LINKS, validateLinkInput } from "@/lib/links";
import { requireUser } from "@/lib/session";

// 링크가 바뀌면 대시보드와 공개 페이지가 새 목록을 보여주도록 "다시 그려줘"라고 알린다.
function refreshPages(username) {
  revalidatePath("/dashboard");
  revalidatePath(`/${username}`);
}

// 링크 추가
export async function createLink(prevState, formData) {
  // 1. 누가 요청했는지 확인 (로그인 안 했으면 여기서 /login 으로 보내진다)
  const user = await requireUser();

  const title = formData.get("title")?.trim();
  const url = formData.get("url")?.trim();

  // 2. 입력값 검사
  const error = validateLinkInput(title, url);
  if (error) {
    return { error, title, url };
  }

  // 3. 개수 제한 검사 — 화면에서 폼을 숨겨도, 서버에서 다시 한 번 꼭 확인해야 한다
  const [{ total, lastPosition }] = await db
    .select({ total: count(), lastPosition: max(link.position) })
    .from(link)
    .where(eq(link.userId, user.id));

  if (total >= MAX_LINKS) {
    // 다른 탭에서 이미 3개를 채웠을 수 있으니, 화면도 최신 목록으로 다시 그린다.
    refreshPages(user.username);
    return { error: `무료 버전은 링크를 ${MAX_LINKS}개까지만 만들 수 있어요.`, title, url };
  }

  // 4. 저장 (새 링크는 목록의 맨 뒤에 붙인다)
  await db.insert(link).values({
    userId: user.id,
    title,
    url,
    position: (lastPosition ?? -1) + 1,
  });

  refreshPages(user.username);
  return { success: true };
}

// 링크 수정
export async function updateLink(prevState, formData) {
  const user = await requireUser();

  const id = Number(formData.get("id"));
  const title = formData.get("title")?.trim();
  const url = formData.get("url")?.trim();

  const error = validateLinkInput(title, url);
  if (error) {
    return { error, title, url };
  }

  // "이 id 이면서 + 내 링크인 것"만 수정한다. 남의 링크 id를 보내도 아무것도 바뀌지 않는다.
  const updated = await db
    .update(link)
    .set({ title, url })
    .where(and(eq(link.id, id), eq(link.userId, user.id)))
    .returning({ id: link.id });

  if (updated.length === 0) {
    return { error: "링크를 찾을 수 없습니다." };
  }

  refreshPages(user.username);
  return { success: true };
}

// 링크 삭제
export async function deleteLink(formData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));

  // 수정과 마찬가지로, 내 링크일 때만 삭제된다.
  await db.delete(link).where(and(eq(link.id, id), eq(link.userId, user.id)));

  refreshPages(user.username);
}
