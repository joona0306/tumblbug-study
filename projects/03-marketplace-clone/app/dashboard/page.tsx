import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { listMyProducts } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import ProductCard from "../product-card";
import ContactForm from "./contact-form";

export default async function DashboardPage() {
  // 로그인하지 않은 사람은 이 줄에서 /login 으로 보내지고, 아래 코드는 실행되지 않는다.
  const user = await requireUser();
  const products = await listMyProducts(user.id);

  // filter: 조건에 맞는 것만 남긴다 → 개수 세기
  const sellingCount = products.filter((item) => item.status === "selling").length;
  const soldCount = products.length - sellingCount;

  return (
    <div className="stack">
      <div className="card">
        <div className="row spread">
          <h1>내 판매 상품</h1>
          <form action={signOut}>
            <button type="submit" className="secondary">
              로그아웃
            </button>
          </form>
        </div>
        <p>
          안녕하세요, <strong>{user.username}</strong>님! 판매중 {sellingCount}개 · 거래완료 {soldCount}개
        </p>
        <p className="row">
          <Link href="/products/new" className="button">
            내 물건 팔기
          </Link>
          <Link href="/">전체 목록 보기</Link>
        </p>
      </div>

      {products.length === 0 ? (
        <p className="card muted">아직 올린 물건이 없어요.</p>
      ) : (
        <ul className="product-grid">
          {products.map((item) => (
            <li key={item.id}>
              <ProductCard item={item} />
            </li>
          ))}
        </ul>
      )}

      <div className="card">
        <h2>연락 방법</h2>
        <p className="muted small">상품에 관심 있는 사람이 이 방법으로 연락해요. 전화번호보다 오픈채팅 링크를 추천해요.</p>
        <ContactForm currentContact={user.contact} />
      </div>
    </div>
  );
}
