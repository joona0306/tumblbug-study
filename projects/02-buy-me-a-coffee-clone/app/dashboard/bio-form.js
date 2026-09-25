"use client";

import { useActionState } from "react";
import { updateBio } from "@/app/actions/profile";

// 한 줄 소개를 고치는 폼. 저장된 소개(currentBio)를 처음 값으로 보여준다.
export default function BioForm({ currentBio }) {
  const [state, formAction, pending] = useActionState(updateBio, null);

  return (
    <form action={formAction}>
      <label>
        한 줄 소개 (후원 페이지 맨 위에 보여요)
        <input
          name="bio"
          maxLength={100}
          placeholder="예: 매주 개발 공부 기록을 올리고 있어요"
          defaultValue={state?.bio ?? currentBio ?? ""}
        />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="muted small">저장했어요.</p>}
      <button type="submit" disabled={pending}>
        {pending ? "저장 중..." : "소개 저장"}
      </button>
    </form>
  );
}
