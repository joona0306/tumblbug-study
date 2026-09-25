// 링크 관련 규칙을 한곳에 모아둔다. (화면과 서버가 같은 숫자를 쓰도록)
export const MAX_LINKS = 3;

// 사용자가 입력한 제목과 주소가 올바른지 검사한다.
// 문제가 있으면 에러 문장을, 없으면 null 을 돌려준다.
export function validateLinkInput(title, url) {
  if (!title) {
    return "제목을 입력해주세요.";
  }
  if (title.length > 50) {
    return "제목은 50자 이하로 입력해주세요.";
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "주소는 https:// 로 시작하는 전체 주소로 입력해주세요.";
  }
  // "javascript:" 같은 위험한 주소가 공개 페이지에 올라가지 않도록 http/https 만 허용한다.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "주소는 http:// 또는 https:// 로 시작해야 합니다.";
  }
  return null;
}
