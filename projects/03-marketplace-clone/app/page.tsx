import Link from "next/link";
import { listProducts } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import ProductCard from "./product-card";

export default async function Home() {
  const user = await getCurrentUser();
  const products = await listProducts();

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

      {products.length === 0 ? (
        <p className="card muted">아직 올라온 물건이 없어요. 첫 번째로 올려보세요!</p>
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
