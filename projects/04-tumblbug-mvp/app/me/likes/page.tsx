import type { Metadata } from "next";
import { LikedProjectGrid } from "@/components/like/LikedProjectGrid";
import { db } from "@/db";
import { listLikedProjects } from "@/lib/queries/listing";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "내 찜 — 모아" };

// 내 찜 (/me/likes) — 로그인 필요 (proxy + requireUser)
export default async function MyLikesPage() {
  const me = await requireUser("/me/likes");
  const projects = await listLikedProjects(db, me.id);

  return (
    <main className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)", paddingBlock: "var(--spacing-xl) var(--spacing-3xl)" }}>
      <h1 className="text-heading-l">내 찜</h1>
      <LikedProjectGrid projects={projects} nowIso={new Date().toISOString()} />
    </main>
  );
}
