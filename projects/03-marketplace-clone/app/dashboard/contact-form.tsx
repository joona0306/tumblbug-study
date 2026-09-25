"use client";

import { useActionState } from "react";
import { updateContact } from "@/app/actions/profile";

// 부품이 받는 값(props)의 모양을 적어 둔다. currentContact 는 아직 안 적었으면 null 일 수 있다.
type ContactFormProps = {
  currentContact: string | null | undefined;
};

export default function ContactForm({ currentContact }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(updateContact, null);

  return (
    <form action={formAction}>
      <label>
        연락 방법 (로그인한 사람에게만 보여요)
        <input
          name="contact"
          maxLength={100}
          placeholder="예: 카카오톡 오픈채팅 https://open.kakao.com/..."
          defaultValue={state?.contact ?? currentContact ?? ""}
        />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="muted small">저장했어요.</p>}
      <button type="submit" disabled={pending}>
        {pending ? "저장 중..." : "연락 방법 저장"}
      </button>
    </form>
  );
}
