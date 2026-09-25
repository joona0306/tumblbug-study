import Link from "next/link";

// 없는 주소로 들어오거나 notFound()가 호출되면 보이는 페이지
export default function NotFound() {
  return (
    <div className="card">
      <h1>페이지를 찾을 수 없어요</h1>
      <p className="muted">주소가 맞는지 다시 확인해주세요.</p>
      <Link href="/">처음으로</Link>
    </div>
  );
}
