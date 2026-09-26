import { useId } from "react";
import styles from "./Field.module.css";

// Figma Input: 이름표 + 칸 + 도움말. 상태 = Default / Focus / Error / Disabled
// error 가 있으면 도움말 자리에 "무엇을 어떻게 고칠지"를 보여준다 (zod 에러 메시지와 같은 문장)
type FieldProps = {
  label: string;
  helper?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Field({ label, helper, error, id, ...inputProps }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? helper;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={`${styles.input} ${error ? styles.error : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message && (
        <p id={messageId} className={`${styles.message} ${error ? styles.errorText : ""}`}>
          {message}
        </p>
      )}
    </div>
  );
}
