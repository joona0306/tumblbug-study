"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import styles from "./ToastProvider.module.css";

// 토스트 알림 (상태 관리 지도: "앱 전체 공유 값" → React Context)
// 어느 화면의 어느 컴포넌트든 useToast().show("…") 한 줄로 화면 아래에 잠깐 알림을 띄운다.
// Zustand 가 아니라 Context 인 이유: 값이 자주 바뀌지 않고(알림 몇 개), 저장·복원도 필요 없는 "앱 전체의 도구"라서
type Tone = "info" | "error";
type Toast = { id: number; message: string; tone: Tone };
type ToastApi = { show: (message: string, tone?: Tone) => void };

const ToastContext = createContext<ToastApi | null>(null);
const DURATION_MS = 4_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: Tone = "info") => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]); // 한꺼번에 최대 3개
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), DURATION_MS);
  }, []);

  // 값 객체를 한 번만 만든다 — 그러지 않으면 알림이 뜰 때마다(=이 컴포넌트가 다시 그려질 때마다) 새 객체가 되어,
  // useToast() 를 useEffect 의존성에 넣은 컴포넌트가 "바뀌었다"고 보고 효과를 또 실행한다 (같은 알림이 여러 번 뜨는 버그)
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live: 화면 낭독기가 새 알림을 읽어 준다 (화면을 보지 못해도 결과를 알 수 있게) */}
      <div className={styles.region} role="status" aria-live="polite" aria-label="알림">
        {toasts.map((t) => {
          const Icon = t.tone === "error" ? CircleAlert : CircleCheck;
          return (
            <p key={t.id} className={`${styles.toast} ${styles[t.tone]}`}>
              <Icon size={18} aria-hidden="true" />
              {t.message}
            </p>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast 는 <ToastProvider> 안에서만 쓸 수 있어요");
  return api;
}
