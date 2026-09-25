import Link from "next/link";
import { listProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import ProductCard from "./product-card";

// 주소의 ? 뒤에 붙은 값들 (예: /?q=의자 → { q: "의자" }). 없을 수도 있어서 ? 를 붙인다
type HomeProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { q = "" } = await searchParams;
  const user = await getCurrentUser();
  const products = await listProducts({ q });

  return (
    <div className="stack">
      <div className="row spread">
        <h1>🥕 동네 마켓</h1>
        {user ? (
          <span className="row">
            <Link href="/dashboard">내 판매 상품</Link>
            <Link href="/products/new" className="button">
              내 물건 팔기
            </Link>
          </span>
        ) : (
          <span className="row">
            <Link href="/login">로그인</Link>
            <Link href="/signup" className="button">
              회원가입
            </Link>
          </span>
        )}
      </div>

      {/* method 를 적지 않은 폼은 GET: 제출하면 입력값이 주소 뒤에 ?q=... 로 붙어 이 페이지를 다시 연다 */}
      <form className="search" role="search">
        <input name="q" type="search" placeholder="어떤 물건을 찾으세요?" defaultValue={q} aria-label="검색어" />
        <button type="submit">검색</button>
      </form>

      {q && (
        <p className="muted small">
          &quot;{q}&quot; 검색 결과 {products.length}개 · <Link href="/">전체 보기</Link>
        </p>
      )}

      {products.length === 0 ? (
        <p className="card muted">{q ? "검색 결과가 없어요. 다른 단어로 찾아보세요." : "아직 올라온 물건이 없어요. 첫 번째로 올려보세요!"}</p>
      ) : (
        <ul className="product-grid">
          {products.map((item) => (
            <li key={item.id}>
              <ProductCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
