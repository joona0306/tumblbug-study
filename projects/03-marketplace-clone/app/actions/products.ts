"use server";

import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { product } from "@/db/schema";
import {
  type Category,
  DESCRIPTION_MAX_LENGTH,
  isCategory,
  PRICE_MAX,
  TITLE_MAX_LENGTH,
} from "@/lib/product";
import { requireUser } from "@/lib/session";

const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 서버가 받는 사진 최대 2MB (브라우저에서 줄였다면 훨씬 작다)

// 폼에 입력한 값들의 모양 (에러가 나면 다시 채워 주려고 돌려보낸다)
export type ProductFormValues = {
  title: string;
  price: string;
  category: string;
  description: string;
};

export type ProductFormState = {
  error: string;
  values: ProductFormValues;
} | null;

// 검사를 통과한 값들의 모양. price 는 숫자, category 는 정해진 목록 중 하나로 "좁혀진" 타입이다.
type ValidProduct = {
  title: string;
  price: number;
  category: Category;
  description: string;
};

// 폼 값을 꺼내 검사한다. 성공하면 { ok: true, data }, 실패하면 { ok: false, error }.
// 이렇게 결과를 두 모양 중 하나로 돌려주면, 쓰는 쪽에서 ok 를 확인해야만 data 를 쓸 수 있다.
function parseProductForm(
  formData: FormData,
): { ok: true; data: ValidProduct; values: ProductFormValues } | { ok: false; error: string; values: ProductFormValues } {
  const values: ProductFormValues = {
    title: String(formData.get("title") ?? "").trim(),
    price: String(formData.get("price") ?? "").trim(),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
  };

  if (!values.title) return { ok: false, error: "제목을 입력해주세요.", values };
  if (values.title.length > TITLE_MAX_LENGTH) {
    return { ok: false, error: `제목은 ${TITLE_MAX_LENGTH}자 이하로 써주세요.`, values };
  }

  const price = Number(values.price);
  // Number.isInteger: 소수점·글자·빈칸이면 false
  if (values.price === "" || !Number.isInteger(price) || price < 0 || price > PRICE_MAX) {
    return { ok: false, error: "가격은 0원 이상의 숫자로 입력해주세요. (0원 = 나눔)", values };
  }

  if (!isCategory(values.category)) {
    return { ok: false, error: "카테고리를 골라주세요.", values };
  }
  // ↑ 이 검사를 통과했으므로, 여기부터 TypeScript 는 values.category 를 Category 타입으로 안다

  if (values.description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: `설명은 ${DESCRIPTION_MAX_LENGTH}자 이하로 써주세요.`, values };
  }

  return {
    ok: true,
    data: { title: values.title, price, category: values.category, description: values.description },
    values,
  };
}

// 사진 파일 검사. 문제가 없으면 null, 있으면 에러 문장
function checkImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "사진 파일만 올릴 수 있어요.";
  if (file.size > IMAGE_MAX_BYTES) return "사진이 너무 커요. 2MB 이하로 올려주세요.";
  return null;
}

// Vercel Blob 공개 저장소에 사진을 올리고 주소를 돌려받는다
async function uploadImage(userId: string, file: File): Promise<string> {
  const blob = await put(`products/${userId}/photo.jpg`, file, {
    access: "public",
    addRandomSuffix: true, // 이름 끝에 무작위 글자를 붙여 겹치지 않게 한다
    contentType: file.type,
  });
  return blob.url;
}

// 상품 등록
export async function createProduct(
  prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const me = await requireUser();

  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, values: parsed.values };
  }

  const image = formData.get("image");
  // instanceof File: 폼 값이 글자가 아니라 "파일"인지 확인. 크기가 0이면 고르지 않은 것
  if (!(image instanceof File) || image.size === 0) {
    return { error: "사진을 1장 골라주세요.", values: parsed.values };
  }
  const imageError = checkImage(image);
  if (imageError) {
    return { error: imageError, values: parsed.values };
  }

  const imageUrl = await uploadImage(me.id, image);

  const [created] = await db
    .insert(product)
    .values({ ...parsed.data, userId: me.id, imageUrl })
    .returning({ id: product.id });

  redirect(`/products/${created.id}`);
}

// "이 번호의 상품 + 주인이 나" 인 상품만 찾는다. 남의 상품이면 undefined
async function findOwnedProduct(id: number, userId: string) {
  const [found] = await db
    .select({ id: product.id, imageUrl: product.imageUrl })
    .from(product)
    .where(and(eq(product.id, id), eq(product.userId, userId)));
  return found;
}

// 상품 수정 (사진은 새로 골랐을 때만 바꾼다)
export async function updateProduct(
  prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const me = await requireUser();
  const id = Number(formData.get("id"));

  const parsed = parseProductForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, values: parsed.values };
  }

  // 1. 내 상품인지 확인 (숨은 칸의 id 를 남의 상품 번호로 바꿔 보내도 여기서 막힌다)
  const owned = await findOwnedProduct(id, me.id);
  if (!owned) {
    return { error: "수정할 수 없는 상품입니다.", values: parsed.values };
  }

  // 2. 새 사진을 골랐으면 검사하고 올린다
  let newImageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const imageError = checkImage(image);
    if (imageError) {
      return { error: imageError, values: parsed.values };
    }
    newImageUrl = await uploadImage(me.id, image);
  }

  // 3. DB 수정 (새 사진이 있을 때만 imageUrl 도 바꾼다)
  await db
    .update(product)
    .set({ ...parsed.data, ...(newImageUrl ? { imageUrl: newImageUrl } : {}) })
    .where(and(eq(product.id, id), eq(product.userId, me.id)));

  // 4. 사진을 바꿨다면 옛 사진은 저장소에서 지운다 (안 지우면 아무도 안 쓰는 파일이 쌓인다)
  if (newImageUrl) {
    await del(owned.imageUrl);
  }

  revalidatePath("/");
  redirect(`/products/${id}`);
}

// 상품 삭제
export async function deleteProduct(formData: FormData) {
  const me = await requireUser();
  const id = Number(formData.get("id"));

  // 내 상품일 때만 지워지고, 지운 줄의 사진 주소를 돌려받는다
  const [deleted] = await db
    .delete(product)
    .where(and(eq(product.id, id), eq(product.userId, me.id)))
    .returning({ imageUrl: product.imageUrl });

  if (deleted) {
    await del(deleted.imageUrl); // 저장소의 사진도 함께 지운다
  }

  revalidatePath("/");
  redirect("/dashboard");
}
