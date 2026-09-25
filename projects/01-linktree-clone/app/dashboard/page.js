import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  // 요청에 담겨 온 쿠키를 Better Auth에게 보여주고 "이 사람 누구야?"라고 묻는다.
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="card">
      <h1>대시보드</h1>
      {session ? (
        <p>
          안녕하세요, <strong>{session.user.username}</strong>님!
        </p>
      ) : (
        <p className="muted">로그인하지 않은 상태입니다.</p>
      )}
    </div>
  );
}
