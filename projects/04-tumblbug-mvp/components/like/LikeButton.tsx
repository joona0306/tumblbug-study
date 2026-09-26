"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLikes, useToggleLike } from "@/lib/likes-client";
import styles from "./LikeButton.module.css";

// 찜 버튼 (Figma LikeButton: Default / Liked).
//  - overlay: 카드 사진 위 동그란 하트
//  - labeled: 상세 화면 하단의 하트 + 찜 개수
// count: 서버가 그린 찜 개수. likedAtRender: 그때 내가 찜해 있었는지.
//   → 지금 찜 상태가 바뀌면 개수를 ±1 해서 보여 준다 (개수를 따로 다시 가져오지 않아도 즉시 맞는다)
export function LikeButton({
  projectId,
  title,
  variant = "overlay",
  count,
  likedAtRender = false,
}: {
  projectId: number;
  title: string;
  variant?: "overlay" | "labeled";
  count?: number;
  likedAtRender?: boolean;
}) {
  const { data: likes } = useLikes();
  const toggle = useToggleLike();
  const router = useRouter();
  const pathname = usePathname();
  const liked = likes?.includes(projectId) ?? false;

  function onClick() {
    // 로그인하지 않았으면 로그인 화면으로 (로그인 후 지금 화면으로 돌아온다)
    if (likes === null) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    toggle.mutate({ projectId, like: !liked });
  }

  const shownCount = count === undefined ? undefined : count - (likedAtRender ? 1 : 0) + (liked ? 1 : 0);
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      aria-pressed={liked}
      aria-label={`${title} 찜하기`}
      onClick={onClick}
    >
      <Heart size={variant === "overlay" ? 20 : 22} className={liked ? styles.filled : undefined} aria-hidden="true" />
      {shownCount !== undefined && <span className={styles.count}>{shownCount}</span>}
    </button>
  );
}
