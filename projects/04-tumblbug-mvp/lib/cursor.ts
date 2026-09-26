// 커서(cursor) = "마지막으로 본 항목"을 가리키는 표. 다음 페이지는 "이 항목 다음부터" 가져온다.
//   offset(몇 번째부터) 방식: 중간에 새 프로젝트가 생기면 같은 항목이 두 번 나오거나 빠진다, 뒤로 갈수록 느리다
//   cursor 방식: 정렬 기준값 + id 로 "다음"을 정확히 찾는다, 인덱스를 타서 항상 빠르다
// 브라우저에는 내용을 알 필요 없는 글자(base64url)로 준다

export type Cursor = { v: string | number; id: number };

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

// 잘못된 커서는 undefined (누구나 주소를 고쳐 보낼 수 있으므로 믿지 않는다)
export function decodeCursor(value: string | undefined | null): Cursor | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "v" in parsed &&
      Number.isInteger(parsed.id) &&
      (typeof parsed.v === "string" || typeof parsed.v === "number")
    ) {
      return { v: parsed.v, id: parsed.id as number };
    }
  } catch {
    // 아래로
  }
  return undefined;
}
