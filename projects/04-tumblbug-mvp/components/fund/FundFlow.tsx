"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { allowedStep, type RewardForRules, type Step } from "@/lib/funding/rules";
import { useFundingStore } from "@/lib/funding/store";
import { ConfirmStep } from "./ConfirmStep";
import { RewardStep } from "./RewardStep";
import { ShippingStep } from "./ShippingStep";
import { Steps } from "./Steps";
import styles from "./FundFlow.module.css";

export type FundReward = RewardForRules & { title: string; description: string; deliveryMonth: string };
export type FundProject = { id: number; title: string; imageUrl: string; creatorName: string };

// 지금 브라우저에서 그리고 있는가? (서버에서는 false, 브라우저에서는 true)
// persist 는 브라우저의 sessionStorage 에서 선택을 읽어 오므로, 서버가 그린 빈 화면과 어긋나지 않게 브라우저에서만 그린다
const subscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// 여러 단계 후원 (Figma M04·M05·M06). 단계는 주소(?step=)에, 고른 내용은 Zustand 스토어에.
export function FundFlow({ project, rewards, step, tossClientKey }: { project: FundProject; rewards: FundReward[]; step: Step; tossClientKey: string | null }) {
  const router = useRouter();
  const isClient = useIsClient();
  const draft = useFundingStore();
  const { start } = draft;

  useEffect(() => start(project.id), [start, project.id]);

  // 주소의 단계에 들어갈 수 없으면 (앞 단계를 안 끝냈으면) 들어갈 수 있는 단계로 바꾼다
  const allowed = isClient && draft.projectId === project.id ? allowedStep(step, draft, rewards) : step;
  useEffect(() => {
    if (isClient && allowed !== step) router.replace(`/projects/${project.id}/fund?step=${allowed}`);
  }, [isClient, allowed, step, router, project.id]);

  const go = (next: Step) => router.push(`/projects/${project.id}/fund?step=${next}`);

  if (!isClient || draft.projectId !== project.id) {
    return <p className={styles.loading}>불러오는 중…</p>;
  }

  return (
    <div className={styles.flow}>
      <Steps current={allowed} />
      {allowed === 1 && <RewardStep rewards={rewards} onNext={() => go(allowedStep(2, useFundingStore.getState(), rewards))} />}
      {allowed === 2 && <ShippingStep onPrev={() => go(1)} onNext={() => go(3)} />}
      {allowed === 3 && <ConfirmStep project={project} rewards={rewards} onEdit={go} tossClientKey={tossClientKey} />}
    </div>
  );
}
