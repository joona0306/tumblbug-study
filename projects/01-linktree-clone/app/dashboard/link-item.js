"use client";

import { useActionState, useState } from "react";
import { deleteLink, updateLink } from "@/app/actions/links";

// 링크 한 줄. 평소엔 제목/주소를 보여주고, "수정"을 누르면 입력 폼으로 바뀐다.
export default function LinkItem({ item }) {
  const [editing, setEditing] = useState(false);

  // 서버의 updateLink 를 부르고, 성공하면 다시 보기 모드로 돌아간다.
  async function saveLink(prevState, formData) {
    const result = await updateLink(prevState, formData);
    if (result.success) {
      setEditing(false);
    }
    return result;
  }
  const [state, formAction, pending] = useActionState(saveLink, null);

  if (editing) {
    return (
      <li className="link-item">
        <form action={formAction}>
          <input type="hidden" name="id" value={item.id} />
          {/* 에러가 나면 방금 입력한 값을, 아니면 원래 값을 보여준다 */}
          <input name="title" defaultValue={state?.title ?? item.title} required maxLength={50} aria-label="제목" />
          <input name="url" defaultValue={state?.url ?? item.url} required aria-label="주소" />
          {state?.error && <p className="error">{state.error}</p>}
          <div className="row">
            <button type="submit" disabled={pending}>
              {pending ? "저장 중..." : "저장"}
            </button>
            <button type="button" className="secondary" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="link-item">
      <div>
        <strong>{item.title}</strong>
        <div className="muted small">{item.url}</div>
      </div>
      <div className="row">
        <button type="button" className="secondary" onClick={() => setEditing(true)}>
          수정
        </button>
        <form action={deleteLink}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className="danger">
            삭제
          </button>
        </form>
      </div>
    </li>
  );
}
