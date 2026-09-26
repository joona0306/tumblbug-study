"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/providers/ToastProvider";
import { LIKES_KEY, type LikesData } from "./likes-key";

// 찜 목록 가져오기. 로그인하지 않았으면(401) null
async function fetchLikes(): Promise<LikesData> {
  const res = await fetch("/api/likes");
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`찜 목록을 불러오지 못했어요 (${res.status})`);
  return ((await res.json()) as { projectIds: number[] }).projectIds;
}

// 카드·상세·헤더가 모두 이 훅으로 "같은 캐시"를 본다 → 한 곳에서 찜하면 모든 곳이 동시에 바뀐다
// 첫 값은 레이아웃이 서버에서 채워 준다(HydrationBoundary) → 처음 그릴 때 깜빡이지 않는다
export function useLikes() {
  return useQuery({ queryKey: LIKES_KEY, queryFn: fetchLikes });
}

type Toggle = { projectId: number; like: boolean };

async function sendToggle({ projectId, like }: Toggle) {
  const res = like
    ? await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId }) })
    : await fetch(`/api/likes/${projectId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(res.status === 429 ? "너무 자주 눌렀어요. 잠시 후 다시 시도해 주세요" : "찜하지 못했어요. 다시 시도해 주세요");
}

// 찜하기·취소 — 낙관적 업데이트: 서버 대답을 기다리지 않고 화면부터 바꾼다 (누르자마자 하트가 채워진다)
//  onMutate  : ① 진행 중인 찜 목록 요청을 멈추고 ② 지금 값을 기억해 두고 ③ 캐시를 "성공했다 치고" 바꾼다
//  onError   : 서버가 실패하면 ②에서 기억한 값으로 되돌리고 토스트로 알린다
//  onSettled : 성공이든 실패든 서버의 진짜 목록을 다시 가져와 맞춘다
export function useToggleLike() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: sendToggle,
    onMutate: async ({ projectId, like }: Toggle) => {
      await queryClient.cancelQueries({ queryKey: LIKES_KEY }); // ① 늦게 도착한 옛 목록이 낙관적 값을 덮어쓰지 않게
      const previous = queryClient.getQueryData<LikesData>(LIKES_KEY); // ②
      queryClient.setQueryData<LikesData>(LIKES_KEY, (ids) => {
        if (!ids) return ids;
        return like ? [projectId, ...ids.filter((id) => id !== projectId)] : ids.filter((id) => id !== projectId); // ③
      });
      return { previous };
    },
    onError: (error, _toggle, context) => {
      queryClient.setQueryData(LIKES_KEY, context?.previous ?? null);
      toast.show(error.message, "error");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: LIKES_KEY }),
  });
}
