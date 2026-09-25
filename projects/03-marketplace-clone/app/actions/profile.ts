"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/session";

const CONTACT_MAX_LENGTH = 100;

// 연락 방법 폼의 결과 모양
export type ContactFormState = {
  contact: string;
  error?: string;
  success?: boolean;
} | null;

// 판매자 연락 방법 수정
export async function updateContact(
  prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const me = await requireUser();
  const contact = String(formData.get("contact") ?? "").trim();

  if (contact.length > CONTACT_MAX_LENGTH) {
    return { error: `연락 방법은 ${CONTACT_MAX_LENGTH}자 이하로 써주세요.`, contact };
  }

  // 로그인한 "나"의 줄만 바꾼다.
  await db.update(user).set({ contact }).where(eq(user.id, me.id));

  revalidatePath("/dashboard");
  return { success: true, contact };
}
