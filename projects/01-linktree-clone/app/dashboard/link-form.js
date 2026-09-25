"use client";

import { useActionState } from "react";
import { createLink } from "@/app/actions/links";

// 새 링크를 추가하는 입력 폼
// (React는 폼 제출이 끝나면 입력칸을 자동으로 비운다. 에러가 나면 서버가 돌려준 값으로 다시 채운다.)
export default function LinkForm() {
  const [state, formAction, pending] = useActionState(createLink, null);

  return (
    <form action={formAction}>
      <label>
        제목
        <input name="title" placeholder="예: 내 유튜브" required maxLength={50} defaultValue={state?.title} />
      </label>
      <label>
        주소
        <input name="url" placeholder="https://..." required defaultValue={state?.url} />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending}>
        {pending ? "추가 중..." : "링크 추가"}
      </button>
    </form>
  );
}
