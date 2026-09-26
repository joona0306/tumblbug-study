import "server-only";
import { del, put } from "@vercel/blob";

// 사진 저장소(Vercel Blob) 도우미 — 서버에서만 쓴다 (토큰이 브라우저로 새면 안 되므로 server-only)

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 브라우저에서 1280px로 줄였다면 보통 0.2~0.5MB

// 사진 파일 검사. 문제가 없으면 null, 있으면 에러 문장
export function checkImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "사진 파일만 올릴 수 있어요";
  if (file.size > IMAGE_MAX_BYTES) return "사진이 너무 커요. 2MB 이하로 올려 주세요";
  return null;
}

// 공개 저장소에 올리고 주소를 받는다. 창작자별 폴더에 무작위 이름으로 (겹치지 않게)
export async function uploadProjectImage(userId: string, file: File): Promise<string> {
  const blob = await put(`projects/${userId}/cover.jpg`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type,
  });
  return blob.url;
}

// 더 이상 쓰지 않는 사진 지우기. 우리 저장소 주소일 때만 (시드 데이터의 Unsplash 사진 등은 건드리지 않는다)
export async function deleteImageIfOurs(url: string): Promise<void> {
  if (!new URL(url).hostname.endsWith(".public.blob.vercel-storage.com")) return;
  try {
    await del(url);
  } catch (error) {
    // 사진 지우기에 실패해도 사용자의 저장은 이미 끝났다 → 기록만 남기고 넘어간다 (고아 사진은 운영 점검에서 정리)
    console.error("[blob] 이전 사진을 지우지 못했습니다", error);
  }
}
