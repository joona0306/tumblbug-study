import Link from "next/link";

export default function Home() {
  return (
    <div className="card">
      <h1>My Links</h1>
      <p className="muted">여러 개의 링크를 한 페이지에 모아서 보여주세요.</p>
      <p>
        <Link href="/signup" className="button">
          회원가입
        </Link>{" "}
        <Link href="/login">로그인</Link>
      </p>
    </div>
  );
}
