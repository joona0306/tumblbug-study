"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useTransition } from "react";
import { setTheme } from "@/app/actions/theme";
import { useToast } from "@/components/providers/ToastProvider";
import { THEME_LABEL, THEME_SHORT_LABEL, THEMES, type Theme } from "@/lib/theme";
import styles from "./ThemePicker.module.css";

const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

// 화면 테마 고르기 (마이페이지). 고르는 즉시 저장되고 화면 색이 바뀐다
// 라디오 버튼 묶음(fieldset) → 키보드 화살표로도 고를 수 있다
export function ThemePicker({ current }: { current: Theme }) {
  const [selected, setSelected] = useState(current); // 누르자마자 선택 표시 (서버 저장을 기다리지 않는다)
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function choose(theme: Theme) {
    setSelected(theme);
    startTransition(async () => {
      await setTheme(theme);
      toast.show(`화면 테마: ${THEME_LABEL[theme]}`);
    });
  }

  return (
    <fieldset className={styles.group} disabled={pending} aria-busy={pending}>
      <legend className="text-heading-m">화면 테마</legend>
      <p className="text-body-s text-muted">이 기기에서만 적용돼요. 기본은 기기(운영체제·브라우저) 설정을 따라가요.</p>
      <div className={styles.options}>
        {THEMES.map((theme) => {
          const Icon = ICON[theme];
          return (
            <label key={theme} className={styles.option}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={selected === theme}
                onChange={() => choose(theme)}
                className={styles.radio}
                aria-label={THEME_LABEL[theme]} // 화면 낭독기에는 전체 이름 ("시스템 설정 따라가기")
              />
              <Icon size={20} aria-hidden="true" />
              <span className="text-label" aria-hidden="true">
                {THEME_SHORT_LABEL[theme]}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
