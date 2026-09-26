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
    <Link href="/me/likes" className={styles.link} aria-label={`내 찜 ${likes.length}개`}>
      <Heart size={18} aria-hidden="true" />
      <span data-testid="header-like-count">{likes.length}</span>
    </Link>
  );
}
