import { useId } from "react";
import styles from "./Field.module.css";

// Figma Input: 이름표 + 칸 + 도움말. 상태 = Default / Focus / Error / Disabled
// error 가 있으면 도움말 자리에 "무엇을 어떻게 고칠지"를 보여준다 (zod 에러 메시지와 같은 문장)
type Common = { label: string; helper?: string; error?: string };

// 이름표·도움말·접근성 연결(aria-describedby)은 세 종류 칸이 모두 같다
function useFieldIds(id: string | undefined, helper?: string, error?: string) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? helper;
  const a11y = {
    id: inputId,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": message ? messageId : undefined,
  };
  return { inputId, messageId, message, a11y };
}

function Wrapper({ label, inputId, messageId, message, error, children }: Common & { inputId: string; messageId: string; message?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      {children}
      {message && (
        <p id={messageId} className={`${styles.message} ${error ? styles.errorText : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Field({ label, helper, error, id, ...inputProps }: Common & React.InputHTMLAttributes<HTMLInputElement>) {
  const { inputId, messageId, message, a11y } = useFieldIds(id, helper, error);
  return (
    <Wrapper {...{ label, error, inputId, messageId, message }}>
      <input className={`${styles.input} ${error ? styles.error : ""}`} {...a11y} {...inputProps} />
    </Wrapper>
  );
}

export function TextAreaField({ label, helper, error, id, ...props }: Common & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { inputId, messageId, message, a11y } = useFieldIds(id, helper, error);
  return (
    <Wrapper {...{ label, error, inputId, messageId, message }}>
      <textarea className={`${styles.input} ${styles.textarea} ${error ? styles.error : ""}`} {...a11y} {...props} />
    </Wrapper>
  );
}

export function SelectField({ label, helper, error, id, children, ...props }: Common & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { inputId, messageId, message, a11y } = useFieldIds(id, helper, error);
  return (
    <Wrapper {...{ label, error, inputId, messageId, message }}>
      <select className={`${styles.input} ${error ? styles.error : ""}`} {...a11y} {...props}>
        {children}
      </select>
    </Wrapper>
  );
}
