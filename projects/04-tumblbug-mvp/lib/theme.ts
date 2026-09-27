// 화면 테마 (14주차). 기본은 "시스템 설정 따라가기", 마이페이지에서 라이트·다크로 고정할 수 있다
// 저장 위치 = 쿠키 (상태 관리 지도): 서버가 화면을 그릴 때 읽어서 <html data-theme> 를 붙인다
//  → 첫 화면부터 맞는 색으로 나온다 (localStorage 는 서버가 못 읽어, 켤 때 색이 한 번 번쩍 바뀐다)
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "moa-theme";
export const THEME_LABEL: Record<Theme, string> = { system: "시스템 설정 따라가기", light: "라이트", dark: "다크" };
// 버튼에 보이는 짧은 이름 (좁은 모바일 화면에서 한 줄로)
export const THEME_SHORT_LABEL: Record<Theme, string> = { system: "시스템", light: "라이트", dark: "다크" };

// 쿠키 값은 브라우저가 보내는 값이라 아무 글자나 올 수 있다 → 모르는 값이면 기본값
export function parseTheme(value: unknown): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "system";
}

// <html data-theme> 에 넣을 값. "시스템"이면 붙이지 않는다 (CSS 의 prefers-color-scheme 이 알아서 고른다)
export const themeAttribute = (theme: Theme) => (theme === "system" ? undefined : theme);
