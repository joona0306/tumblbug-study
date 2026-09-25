import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// 지금 요청을 보낸 사람이 로그인한 사용자라면 그 정보를, 아니면 null을 돌려준다.
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

// 로그인이 "꼭" 필요한 곳에서 쓴다. 로그인하지 않았으면 로그인 페이지로 보낸다.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
