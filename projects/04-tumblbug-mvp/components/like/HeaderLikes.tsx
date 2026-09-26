"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useLikes } from "@/lib/likes-client";
import styles from "@/components/layout/AppHeader.module.css";

// 헤더의 "내 찜" — 카드·상세와 같은 찜 캐시를 읽으므로, 어디서 찜하든 숫자가 바로 바뀐다
export function HeaderLikes() {
  const { data: likes } = useLikes();
  if (!likes) return null; // 로그인하지 않음
  return (
    // prefetch={false}: 운영 빌드의 Link 는 화면에 보이는 순간 다음 페이지를 미리 받아 둔다.
    // 찜하기 "전"에 받아 둔 /me/likes 를 찜한 "뒤"에 보여 주면 방금 찜한 프로젝트가 빠져 있다 → 누를 때 새로 받게 한다
    <Link href="/me/likes" prefetch={false} className={styles.link} aria-label={`내 찜 ${likes.length}개`}>
      <Heart size={18} aria-hidden="true" />
      <span data-testid="header-like-count">{likes.length}</span>
    </Link>
  );
}
