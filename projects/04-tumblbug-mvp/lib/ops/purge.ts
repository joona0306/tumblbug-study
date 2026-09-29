import { eq, inArray, like, ne, notInArray } from "drizzle-orm";
import type { Db } from "@/db";
import { funding, funnelEvent, paymentEvent, project, projectLike, rateLimit, session, user, verification } from "@/db/schema";

// 운영 종료 — 스터디가 끝나면 사용자 데이터를 지운다 (20주차, /privacy 에서 한 약속)
// 관리자 계정(role = 'admin')만 남기고: 후원·결제 기록·퍼널·찜·프로젝트(리워드)·요청 수 기록·로그인 기록·다른 계정을 모두 지운다
// 한 트랜잭션으로 → 중간에 실패하면 아무것도 지워지지 않는다 (반쯤 지워진 상태가 남지 않게)
// 스크립트(scripts/end-of-service.mts)는 기본이 "세기만" 이고, DB 이름을 한 번 더 입력해야 실제로 지운다

export type PurgeCounts = {
  users: number; // 지울 계정 (관리자 제외)
  keptAdmins: number;
  projects: number;
  fundings: number;
  paymentEvents: number;
  funnelEvents: number;
  likes: number;
  rateLimits: number;
  images: string[]; // Vercel Blob 에 올린 프로젝트 사진 주소 — DB 밖에 있어서 따로 지운다
};

export async function countPurge(db: Db): Promise<PurgeCounts> {
  const images = await db.select({ url: project.imageUrl }).from(project).where(like(project.imageUrl, "%.public.blob.vercel-storage.com/%"));
  return {
    users: await db.$count(user, ne(user.role, "admin")),
    keptAdmins: await db.$count(user, eq(user.role, "admin")),
    projects: await db.$count(project),
    fundings: await db.$count(funding),
    paymentEvents: await db.$count(paymentEvent),
    funnelEvents: await db.$count(funnelEvent),
    likes: await db.$count(projectLike),
    rateLimits: await db.$count(rateLimit),
    images: images.map((i) => i.url),
  };
}

export async function purgeServiceData(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    // 가리키는 쪽부터 지운다: 결제 기록·후원 → 퍼널·찜 → 프로젝트(리워드는 cascade) → 계정(로그인 연결은 cascade)
    await tx.delete(paymentEvent);
    await tx.delete(funding);
    await tx.delete(funnelEvent);
    await tx.delete(projectLike);
    await tx.delete(project);
    await tx.delete(rateLimit);
    await tx.delete(verification); // 이메일 인증 등 임시 기록
    const admins = (await tx.select({ id: user.id }).from(user).where(eq(user.role, "admin"))).map((u) => u.id);
    await tx.delete(user).where(admins.length > 0 ? notInArray(user.id, admins) : undefined);
    // 관리자 계정은 남기지만 로그인 기록(세션·접속 IP)은 지운다 — 다시 로그인하면 된다
    if (admins.length > 0) await tx.delete(session).where(inArray(session.userId, admins));
  });
}
