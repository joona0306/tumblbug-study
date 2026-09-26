// 날짜 도우미 — 모든 날짜는 "한국 시간" 기준 (서버는 UTC로 돌기 때문에 그냥 new Date()로 자르면 하루가 어긋난다)

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 한국 시간으로 "오늘" 날짜 (YYYY-MM-DD)
export function kstToday(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

// 날짜(YYYY-MM-DD)에 n일 더하기
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
