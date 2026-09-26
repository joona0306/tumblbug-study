"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/components/providers/ToastProvider";
import { formatWon } from "@/lib/format";
import type { RecentFunding } from "@/lib/queries/studio";
import styles from "./RecentFundings.module.css";

const REFRESH_MS = 15_000;
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

async function fetchFundings(projectId: number): Promise<RecentFunding[]> {
  const res = await fetch(`/api/projects/${projectId}/fundings`);
  if (!res.ok) throw new Error(`후원 목록을 불러오지 못했어요 (${res.status})`);
  return ((await res.json()) as { items: RecentFunding[] }).items;
}

// 새 후원 자동 확인 (상태 관리 지도: TanStack Query ③ refetchInterval)
//  - 첫 목록은 서버가 그려서 넘긴다(initialData) → 화면이 바로 보인다
//  - 그 뒤 15초마다 조용히 다시 가져온다. 탭을 보고 있지 않으면 멈춘다 (refetchIntervalInBackground: false 가 기본)
//  - 새 후원이 생기면 토스트로 알리고, 새 줄을 잠깐 강조한다
export function RecentFundings({ projectId, initial }: { projectId: number; initial: RecentFunding[] }) {
  const toast = useToast();
  const { data = [], dataUpdatedAt, isError } = useQuery({
    queryKey: ["fundings", projectId],
    queryFn: () => fetchFundings(projectId),
    initialData: initial,
    refetchInterval: REFRESH_MS,
  });

  // 지금까지 본 가장 최근 "결제 완료 시각". 이보다 늦게 결제된 후원 = "새 후원"
  // (후원 번호로 비교하지 않는 이유: 먼저 만든 후원이 나중에 결제될 수도 있다 — 결제창에 오래 머문 경우)
  const [seenAt, setSeenAt] = useState(initial[0]?.paidAt ?? "");
  const latestAt = data[0]?.paidAt ?? "";
  const newIds = data.filter((f) => f.paidAt > seenAt).map((f) => f.id); // ISO 시각 글자는 사전 순서 = 시간 순서
  const newCount = newIds.length;

  useEffect(() => {
    if (newCount === 0) return;
    toast.show(`새 후원 ${newCount}건이 들어왔어요`);
    const timer = setTimeout(() => setSeenAt(latestAt), 3_000); // 3초 동안 강조한 뒤 "본 것"으로
    return () => clearTimeout(timer);
  }, [latestAt, newCount, toast]);

  return (
    <section className={styles.section} aria-labelledby="recent-title">
      <div className={styles.head}>
        <h2 id="recent-title" className="text-heading-m">
          최근 후원
        </h2>
        <p className="text-caption text-muted">
          {isError ? "새로고침 실패 — 잠시 후 다시 시도해요" : `15초마다 자동 새로고침 · ${timeFormat.format(dataUpdatedAt)} 확인`}
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-body-s text-muted">아직 결제 완료된 후원이 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {data.map((f) => (
            <li key={f.id} className={`${styles.item} ${newIds.includes(f.id) ? styles.fresh : ""}`}>
              <div className={styles.row}>
                <span className="text-body-m-strong">{f.supporterName}</span>
                <span className="text-body-m-strong">{formatWon(f.amount)}</span>
              </div>
              <p className="text-body-s text-muted">
                {f.rewardTitle ? `${f.rewardTitle} × ${f.quantity}` : "리워드 없이 후원"} · {timeFormat.format(new Date(f.paidAt))}
              </p>
              {f.message && <p className="text-body-s">“{f.message}”</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
