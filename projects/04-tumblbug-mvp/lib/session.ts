import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// 지금 요청을 보낸 사람이 로그인한 사용자라면 그 정보를, 아니면 null
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// 로그인이 꼭 필요한 곳. 로그인하지 않았으면 로그인 페이지로 보내고, 로그인 후 돌아올 주소를 붙인다.
// proxy.ts 가 먼저 막지만(쿠키만 확인), 진짜 확인은 여기서 한다 (쿠키가 있어도 만료·위조일 수 있다)
export async function requireUser(returnTo = "/") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(returnTo)}`);
  }
  return user;
}

// 관리자만 들어올 수 있는 곳 (13주차 관리자 화면)
export async function requireAdmin(returnTo = "/admin") {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") {
    // 관리자가 아니면 "없는 페이지"로 보이게 한다 — 관리자 화면이 있다는 사실 자체를 숨긴다
    notFound();
  }
  return user;
}
