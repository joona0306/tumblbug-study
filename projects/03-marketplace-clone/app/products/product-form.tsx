"use client";

import { startTransition, useActionState, useState } from "react";
import type { ProductFormState, ProductFormValues } from "@/app/actions/products";
import { resizeImage } from "@/lib/image";
import { CATEGORIES, DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from "@/lib/product";

type ProductFormProps = {
  // 이 폼을 제출하면 부를 서버 액션 (등록 또는 수정)
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initialValues?: ProductFormValues; // 수정할 때 원래 값
  currentImageUrl?: string; // 수정할 때 원래 사진
  submitLabel: string;
  children?: React.ReactNode; // 폼 안에 추가로 넣을 칸 (예: 수정할 상품 번호)
};

const EMPTY: ProductFormValues = { title: "", price: "", category: "", description: "" };

export default function ProductForm({
  action,
  initialValues = EMPTY,
  currentImageUrl,
  submitLabel,
  children,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [resizing, setResizing] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const values = state?.values ?? initialValues;
  const busy = pending || resizing;

  // 사진을 고르면 바로 미리보기를 보여준다
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : (currentImageUrl ?? null));
  }

  // 제출: 사진을 브라우저에서 줄인 뒤 서버 액션으로 보낸다
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // 브라우저 기본 제출을 막고 직접 보낸다
    setClientError(null);
    const formData = new FormData(event.currentTarget);

    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      try {
        setResizing(true);
        formData.set("image", await resizeImage(file));
      } catch {
        setClientError("이 사진은 읽을 수 없어요. 다른 사진(JPG, PNG)을 골라주세요.");
        return;
      } finally {
        setResizing(false);
      }
    }

    // startTransition: "화면을 멈추지 말고 이 작업을 처리해줘". 이 안에서 부르면 pending 이 true 가 된다
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}

      <label>
        사진 {currentImageUrl ? "(바꿀 때만 고르세요)" : "(1장)"}
        <input name="image" type="file" accept="image/*" onChange={handleImageChange} />
      </label>
      {preview && (
        // 방금 고른 사진은 내 컴퓨터 안의 임시 주소(blob:)라서 Next.js <Image> 대신 <img>로 보여준다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="고른 사진 미리보기" className="preview-image" />
      )}

      <label>
        제목
        <input name="title" required maxLength={TITLE_MAX_LENGTH} defaultValue={values.title} />
      </label>
      <label>
        가격 (원, 0원이면 나눔)
        <input name="price" type="number" required min={0} step={1} inputMode="numeric" defaultValue={values.price} />
      </label>
      <label>
        카테고리
        <select name="category" required defaultValue={values.category}>
          <option value="" disabled>
            골라주세요
          </option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label>
        설명
        <textarea name="description" rows={5} maxLength={DESCRIPTION_MAX_LENGTH} defaultValue={values.description} />
      </label>

      {(clientError ?? state?.error) && <p className="error">{clientError ?? state?.error}</p>}
      <button type="submit" disabled={busy}>
        {resizing ? "사진 줄이는 중..." : pending ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}
