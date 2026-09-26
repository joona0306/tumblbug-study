"use client";

import { ImagePlus } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import type { ProjectFormState } from "@/app/actions/projects";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { CATEGORIES } from "@/lib/categories";
import { resizeImage } from "@/lib/image";
import { PROJECT_LIMITS } from "@/lib/validation/project";
import styles from "./ProjectForm.module.css";

type Props = {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  initialValues?: Record<string, string>;
  currentImageUrl?: string;
  lockedGoalAndDeadline?: boolean; // 결제 완료 후원이 있으면 true
  deadlineRange: { min: string; max: string };
  submitLabel: string;
  children?: React.ReactNode; // 폼 안에 추가로 넣을 칸 (예: 수정할 프로젝트 번호)
};

// 프로젝트 만들기·수정 폼 (Figma M08). 입력 검사는 서버(zod)가 하고, 에러는 칸마다 보여준다.
export function ProjectForm({ action, initialValues = {}, currentImageUrl, lockedGoalAndDeadline = false, deadlineRange, submitLabel, children }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [resizing, setResizing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const v = state?.values ?? initialValues;
  const f = state?.fields ?? {};
  const busy = pending || resizing;

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : (currentImageUrl ?? null));
  }

  // 제출: 사진을 브라우저에서 1280px로 줄인 뒤 서버 액션으로 보낸다 (3단계와 같은 방식)
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setImageError(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      try {
        setResizing(true);
        formData.set("image", await resizeImage(file));
      } catch {
        setImageError("이 사진은 읽을 수 없어요. 다른 사진(JPG, PNG)을 골라 주세요");
        return;
      } finally {
        setResizing(false);
      }
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {children}

      <div className={styles.imageField}>
        <label htmlFor="project-image" className={styles.upload}>
          {preview ? (
            // 방금 고른 사진은 내 컴퓨터의 임시 주소(blob:)라서 Next.js <Image> 대신 <img>
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="고른 대표 사진 미리보기" className={styles.preview} />
          ) : (
            <span className={styles.placeholder}>
              <ImagePlus size={24} aria-hidden="true" />
              <span className="text-label">대표 사진 올리기</span>
              <span className="text-caption text-muted">JPG·PNG, 자동으로 1280px로 줄여요</span>
            </span>
          )}
        </label>
        <input
          id="project-image"
          name="image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className={styles.fileInput}
          aria-label={currentImageUrl ? "대표 사진 바꾸기 (바꿀 때만 고르세요)" : "대표 사진"}
          aria-describedby={imageError || f.image ? "project-image-error" : undefined}
        />
        {(imageError || f.image) && (
          <p id="project-image-error" className={styles.error}>
            {imageError ?? f.image}
          </p>
        )}
      </div>

      <Field label="제목" name="title" maxLength={PROJECT_LIMITS.titleMax} required defaultValue={v.title} error={f.title} helper={`최대 ${PROJECT_LIMITS.titleMax}자`} />
      <Field
        label="한 줄 요약"
        name="summary"
        maxLength={PROJECT_LIMITS.summaryMax}
        required
        defaultValue={v.summary}
        error={f.summary}
        helper="목록 카드에 보이는 문장"
      />
      <SelectField label="카테고리" name="category" required defaultValue={v.category ?? ""} error={f.category}>
        <option value="" disabled>
          골라 주세요
        </option>
        {Object.entries(CATEGORIES).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <Field
        label="목표 금액 (원)"
        name="goalAmount"
        inputMode="numeric"
        required
        defaultValue={v.goalAmount}
        error={f.goalAmount}
        disabled={lockedGoalAndDeadline}
        helper={lockedGoalAndDeadline ? "후원이 있어 목표 금액은 바꿀 수 없어요" : "10,000원 ~ 1억 원"}
      />
      <Field
        label="마감일"
        name="deadline"
        type="date"
        min={deadlineRange.min}
        max={deadlineRange.max}
        required
        defaultValue={v.deadline}
        error={f.deadline}
        disabled={lockedGoalAndDeadline}
        helper={lockedGoalAndDeadline ? "후원이 있어 마감일은 바꿀 수 없어요" : "마감일 23:59(한국 시간)에 모금이 끝나요"}
      />
      <TextAreaField label="프로젝트 소개" name="description" maxLength={PROJECT_LIMITS.descriptionMax} defaultValue={v.description} error={f.description} />

      {state?.error && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={busy}>
        {resizing ? "사진 줄이는 중…" : pending ? "저장 중…" : submitLabel}
      </Button>
    </form>
  );
}
