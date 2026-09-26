import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { db } from "@/db";
import { formatWon } from "@/lib/format";
import { listMyFundings, type MyFundingStatus } from "@/lib/queries/fundings";
import { requireUser } from "@/lib/session";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "내 후원 내역 — 모아" };

const STATUS: Record<MyFundingStatus, { badge: BadgeStatus; label: string }> = {
  paid: { badge: "success", label: "결제 완료" },
  processing: { badge: "funding", label: "확인 중" },
  failed: { badge: "failed", label: "결제 실패" },
};

// 날짜는 한국 시간으로 보여 준다 (서버가 어느 나라에 있든 같게)
const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

// 내 후원 내역 (Figma M09) — 로그인 필요 (proxy + requireUser)
export default async function MyFundingsPage() {
  const me = await requireUser("/me/fundings");
  const fundings = await listMyFundings(db, me.id);

  return (
    <main className={`container ${styles.page}`}>
      <h1 className="text-heading-l">내 후원 내역</h1>
      {fundings.length === 0 ? (
        <div className={styles.empty}>
          <p>아직 후원한 프로젝트가 없어요.</p>
          <ButtonLink href="/projects">프로젝트 둘러보기</ButtonLink>
        </div>
      ) : (
        <ul className={styles.list}>
          {fundings.map((f) => {
            const status = STATUS[f.status];
            const [year, month] = f.deliveryMonth?.split("-") ?? [];
            return (
              <li key={f.id} className={styles.item}>
                <Link href={`/projects/${f.projectId}`} className={styles.thumb} aria-hidden="true" tabIndex={-1}>
                  <Image src={f.imageUrl} alt="" fill sizes="96px" />
                </Link>
                <div className={styles.body}>
                  <div className={styles.top}>
                    <Badge status={status.badge}>{status.label}</Badge>
                    <span className="text-caption text-muted">{dateFormat.format(f.createdAt)}</span>
                  </div>
                  <Link href={`/projects/${f.projectId}`} className={`text-body-m-strong ${styles.title}`}>
                    {f.projectTitle}
                  </Link>
                  <p className="text-body-s text-muted">
                    {f.rewardTitle ? `${f.rewardTitle} × ${f.quantity}` : "리워드 없이 후원"}
                    {year && ` · ${year}년 ${Number(month)}월 전달 예정`}
                  </p>
                  <p className="text-body-m-strong">{formatWon(f.amount)}</p>
                  {f.status === "processing" && <p className="text-caption text-muted">결제 결과를 확인하고 있어요. 잠시 후 다시 확인해 주세요.</p>}
                  {f.status === "failed" && <p className="text-caption text-muted">승인되지 않아 돈이 나가지 않았어요 ({f.failReason}).</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
