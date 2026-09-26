import type { Metadata } from "next";
import Link from "next/link";
import { setProjectHidden } from "@/app/actions/admin";
import table from "@/components/studio/Dashboard.module.css";
import { Button } from "@/components/ui/Button";
import { db } from "@/db";
import { formatWon } from "@/lib/format";
import { countFailureReasons, listAllProjects, listPaymentFailures } from "@/lib/queries/admin";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "관리자 — 모아", robots: { index: false } };

const STATUS_LABEL = { funding: "모금중", success: "성공", failed: "실패" } as const;
const dateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

// 관리자 (/admin) — 관리자만 (그 밖의 사람에게는 "없는 페이지" 404)
// ① 프로젝트 숨기기·다시 보이기 ② 최근 30일 결제 실패 목록 + 이유별 개수
export default async function AdminPage() {
  await requireAdmin();
  const [projects, failures, reasons] = await Promise.all([listAllProjects(db), listPaymentFailures(db), countFailureReasons(db)]);

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-2xl)", paddingBlock: "var(--spacing-xl) var(--spacing-3xl)", maxWidth: 960 }}>
      <h1 className="text-heading-l">관리자</h1>

      <section className={table.section} aria-labelledby="projects-title">
        <h2 id="projects-title" className="text-heading-m">
          프로젝트 <span className="text-body-s text-muted">· {projects.length}개</span>
        </h2>
        <div className={table.tableWrap}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col">프로젝트</th>
                <th scope="col">창작자</th>
                <th scope="col">마감일</th>
                <th scope="col">확정 상태</th>
                <th scope="col">공개</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.hidden ? p.title : <Link href={`/projects/${p.id}`}>{p.title}</Link>}</td>
                  <td>{p.creatorName}</td>
                  <td>{p.deadline}</td>
                  <td>{STATUS_LABEL[p.status]}</td>
                  <td>
                    {/* 서버 액션을 부르는 폼 — 자바스크립트가 없어도 동작한다 */}
                    <form action={setProjectHidden}>
                      <input type="hidden" name="projectId" value={p.id} />
                      <input type="hidden" name="hidden" value={String(!p.hidden)} />
                      <Button type="submit" variant={p.hidden ? "primary" : "secondary"} size="m" aria-label={`${p.title} ${p.hidden ? "다시 보이기" : "숨기기"}`}>
                        {p.hidden ? "다시 보이기" : "숨기기"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={table.section} aria-labelledby="reasons-title">
        <h2 id="reasons-title" className="text-heading-m">
          결제 실패 이유 <span className="text-body-s text-muted">· 최근 30일</span>
        </h2>
        {reasons.length === 0 ? (
          <p className="text-body-s text-muted">최근 30일 동안 결제 실패가 없어요.</p>
        ) : (
          <div className={table.tableWrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th scope="col">이유 (코드)</th>
                  <th scope="col">건수</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r) => (
                  <tr key={r.reason}>
                    <td>{r.reason}</td>
                    <td>{r.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={table.section} aria-labelledby="failures-title">
        <h2 id="failures-title" className="text-heading-m">
          결제 실패 목록 <span className="text-body-s text-muted">· 최근 {failures.length}건</span>
        </h2>
        {failures.length > 0 && (
          <div className={table.tableWrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th scope="col">시각</th>
                  <th scope="col">프로젝트</th>
                  <th scope="col">후원자</th>
                  <th scope="col">금액</th>
                  <th scope="col">이유</th>
                  <th scope="col">단계</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.id}>
                    <td>{dateTime.format(f.createdAt)}</td>
                    <td>{f.projectTitle}</td>
                    <td>{f.supporterName}</td>
                    <td>{formatWon(f.amount)}</td>
                    <td>{f.failReason ?? "UNKNOWN"}</td>
                    <td>{f.reachedApproval ? "승인 단계" : "결제창"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
