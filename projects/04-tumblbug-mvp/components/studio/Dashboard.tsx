import { ProgressBar } from "@/components/ui/ProgressBar";
import { achievementRate, formatWon } from "@/lib/format";
import type { getDailyRaised, getDashboardSummary, getRewardBreakdown, listSupporters } from "@/lib/queries/dashboard";
import styles from "./Dashboard.module.css";

type Summary = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
type Daily = Awaited<ReturnType<typeof getDailyRaised>>;
type Breakdown = Awaited<ReturnType<typeof getRewardBreakdown>>;
type Supporters = Awaited<ReturnType<typeof listSupporters>>;

const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });

// ① 모금 현황 카드
export function SummaryCards({ summary }: { summary: Summary }) {
  const rate = achievementRate(summary.raised, summary.goalAmount);
  return (
    <section className={styles.section} aria-labelledby="summary-title">
      <h2 id="summary-title" className="text-heading-m">
        모금 현황
      </h2>
      <div className={styles.progress}>
        <p>
          <span className={`text-display ${styles.rate}`}>{rate}%</span> <span className="text-body-m-strong">{formatWon(summary.raised)}</span>
          <span className="text-body-s text-muted"> / 목표 {formatWon(summary.goalAmount)}</span>
        </p>
        <ProgressBar percent={rate} label="달성률" />
      </div>
      <dl className={styles.cards}>
        <div>
          <dt className="text-caption text-muted">후원자</dt>
          <dd className="text-heading-m">{summary.supporters}명</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">후원 건수</dt>
          <dd className="text-heading-m">{summary.fundings}건</dd>
        </div>
        <div>
          <dt className="text-caption text-muted">평균 후원액</dt>
          <dd className="text-heading-m">{formatWon(summary.average)}</dd>
        </div>
      </dl>
    </section>
  );
}

// ② 날짜별 모금 막대 (라이브러리 없이 CSS 막대 — 높이 = 그날 금액 ÷ 가장 많은 날 금액)
export function DailyChart({ days }: { days: Daily }) {
  const max = Math.max(1, ...days.map((d) => d.amount));
  const total = days.reduce((sum, d) => sum + d.amount, 0);
  return (
    <section className={styles.section} aria-labelledby="daily-title">
      <h2 id="daily-title" className="text-heading-m">
        최근 {days.length}일 모금 <span className="text-body-s text-muted">· {formatWon(total)}</span>
      </h2>
      {/* 화면 낭독기에는 막대 대신 표로 읽히게 한다 */}
      <table className="sr-only">
        <caption>날짜별 모금액</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>
                {formatWon(d.amount)} ({d.count}건)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.chart} aria-hidden="true">
        {days.map((d) => (
          <div key={d.day} className={styles.barCol} title={`${d.day} · ${formatWon(d.amount)} (${d.count}건)`}>
            <div className={styles.bar} style={{ height: `${(d.amount / max) * 100}%` }} />
            <span className={styles.barLabel}>{Number(d.day.slice(8))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ③ 리워드별 판매
export function RewardTable({ breakdown }: { breakdown: Breakdown }) {
  return (
    <section className={styles.section} aria-labelledby="reward-title">
      <h2 id="reward-title" className="text-heading-m">
        리워드별 판매
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">리워드</th>
              <th scope="col">판매</th>
              <th scope="col">남음</th>
              <th scope="col">금액</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rewards.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.title} <span className="text-caption text-muted">{formatWon(r.price)}</span>
                </td>
                <td>{r.paidQty}개</td>
                <td>{r.limitQty === null ? "무제한" : `${r.limitQty - r.soldQty}개`}</td>
                <td>{formatWon(r.revenue)}</td>
              </tr>
            ))}
            <tr>
              <td>리워드 없이 후원</td>
              <td>{breakdown.noReward.count}건</td>
              <td>-</td>
              <td>{formatWon(breakdown.noReward.revenue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ④ 후원자·배송지 — 개인정보라 이 화면(창작자 본인)에서만 보여 준다
export function SupporterTable({ supporters }: { supporters: Supporters }) {
  return (
    <section className={styles.section} aria-labelledby="supporters-title">
      <h2 id="supporters-title" className="text-heading-m">
        후원자·배송지 <span className="text-body-s text-muted">· {supporters.length}건</span>
      </h2>
      <p className={styles.privacy}>배송지는 리워드 발송에만 쓰세요. 다른 곳에 옮기거나 공유하지 마세요.</p>
      {supporters.length === 0 ? (
        <p className="text-body-s text-muted">아직 결제 완료된 후원이 없어요.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">후원자</th>
                <th scope="col">리워드</th>
                <th scope="col">금액</th>
                <th scope="col">받는 분 · 연락처 · 주소</th>
                <th scope="col">결제일</th>
              </tr>
            </thead>
            <tbody>
              {supporters.map((s) => (
                <tr key={s.id}>
                  <td>{s.supporterName}</td>
                  <td>{s.rewardTitle ? `${s.rewardTitle} × ${s.quantity}` : "리워드 없이"}</td>
                  <td>{formatWon(s.amount)}</td>
                  <td>{s.address ? `${s.recipientName} · ${s.recipientPhone} · ${s.address}` : <span className="text-muted">배송 없음</span>}</td>
                  <td>{s.paidAt ? dateFormat.format(s.paidAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
