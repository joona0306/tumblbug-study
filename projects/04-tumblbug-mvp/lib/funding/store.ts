"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Draft } from "./rules";

// 여러 단계 후원 스토어 (Zustand) — 상태 관리 지도: "서버에 없는 값을 여러 화면이 함께 쓴다"
//  - 1·2·3단계 화면이 같은 선택을 본다 (단계를 오가도 유지)
//  - persist: 새로고침해도 유지. 저장소는 sessionStorage(탭을 닫으면 지워짐) —
//    배송지(이름·연락처·주소)가 들어가므로 공용 컴퓨터에 오래 남지 않게 localStorage 를 쓰지 않는다
//  - 결제가 끝나면 reset() 으로 비운다 (11주차)

type FundingState = Draft & {
  projectId: number | null; // 어느 프로젝트의 후원서인지 (다른 프로젝트로 가면 새로 시작)
  message: string; // 응원 메시지
  start: (projectId: number) => void;
  selectReward: (rewardId: number | null) => void;
  setQuantity: (quantity: number) => void;
  setExtraAmount: (amount: number) => void;
  setShipping: (shipping: Partial<Draft["shipping"]>) => void;
  setMessage: (message: string) => void;
  reset: () => void;
};

const EMPTY: Omit<FundingState, "start" | "selectReward" | "setQuantity" | "setExtraAmount" | "setShipping" | "setMessage" | "reset"> = {
  projectId: null,
  rewardId: null,
  quantity: 1,
  extraAmount: 0,
  shipping: { recipientName: "", recipientPhone: "", address: "" },
  message: "",
};

export const useFundingStore = create<FundingState>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      // 다른 프로젝트의 후원서가 남아 있으면 비우고 새로 시작한다
      start: (projectId) => {
        if (get().projectId !== projectId) set({ ...EMPTY, projectId });
      },
      selectReward: (rewardId) => set({ rewardId, quantity: 1 }),
      setQuantity: (quantity) => set({ quantity }),
      setExtraAmount: (extraAmount) => set({ extraAmount }),
      setShipping: (shipping) => set((s) => ({ shipping: { ...s.shipping, ...shipping } })),
      setMessage: (message) => set({ message }),
      reset: () => set(EMPTY),
    }),
    {
      name: "moa-funding-draft",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
