import Link from "next/link";
import { CATEGORIES, isCategory } from "@/lib/product";
import { listProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import ProductCard from "./product-card";

// 주소의 ? 뒤에 붙은 값들 (예: /?q=의자&category=도서&onSale=1). 없을 수도 있어서 ? 를 붙인다
type HomeProps = {
  searchParams: Promise<{ q?: string; category?: string; onSale?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const q = params.q ?? "";
  // 주소는 누구나 고칠 수 있으므로, 목록에 있는 카테고리일 때만 필터로 쓴다
  const category = params.category && isCategory(params.category) ? params.category : undefined;
  const onSale = params.onSale === "1";
  const filtered = Boolean(q || category || onSale);

  const user = await getCurrentUser();
  const products = await listProducts({ q, category, onSale });

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

      {/* method 를 적지 않은 폼은 GET: 제출하면 입력값이 주소 뒤에 ?q=...&category=... 로 붙어 이 페이지를 다시 연다 */}
      <form className="filters" role="search">
        <div className="search">
          <input name="q" type="search" placeholder="어떤 물건을 찾으세요?" defaultValue={q} aria-label="검색어" />
          <button type="submit">검색</button>
        </div>
        <div className="row">
          <select name="category" defaultValue={category ?? ""} aria-label="카테고리">
            <option value="">전체 카테고리</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input type="checkbox" name="onSale" value="1" defaultChecked={onSale} />
            판매중만 보기
          </label>
        </div>
      </form>

      {filtered && (
        <p className="muted small">
          조건에 맞는 물건 {products.length}개 · <Link href="/">조건 지우기</Link>
        </p>
      )}

      {products.length === 0 ? (
        <p className="card muted">
          {filtered ? "조건에 맞는 물건이 없어요. 조건을 바꿔보세요." : "아직 올라온 물건이 없어요. 첫 번째로 올려보세요!"}
        </p>
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
