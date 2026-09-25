"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";

const BIO_MAX_LENGTH = 100;

// 크리에이터 한 줄 소개 수정
export async function updateBio(prevState, formData) {
  const me = await requireUser();
  const bio = formData.get("bio")?.trim() ?? "";

  if (bio.length > BIO_MAX_LENGTH) {
    return { error: `소개는 ${BIO_MAX_LENGTH}자 이하로 써주세요.`, bio };
  }

  // 로그인한 "나"의 줄만 바꾼다. (다른 사람의 소개는 바꿀 방법이 없다)
  await db.update(user).set({ bio }).where(eq(user.id, me.id));

  revalidatePath("/dashboard");
  revalidatePath(`/${me.username}`);
  return { success: true, bio };
}
