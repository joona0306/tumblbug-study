import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { changeStatus } from "@/app/actions/products";
import { db } from "@/db";
import { product, user } from "@/db/schema";
import { formatPrice, STATUS_LABELS } from "@/lib/product";
import { getCurrentUser } from "@/lib/session";
import DeleteButton from "./delete-button";

// 동적 주소 /products/12 의 12 가 params.id 로 들어온다 (주소에서 온 값이라 항상 문자열)
type PageProps = {
  params: Promise<{ id: string }>;
};

// 상품 1개와 판매자 이름을 함께 가져온다 (product 와 user 를 이어 붙이기 = join)
async function findProduct(params: PageProps["params"]) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return null; // /products/abc 처럼 숫자가 아니면 없는 상품

  const [found] = await db
    .select({
      id: product.id,
      title: product.title,
      price: product.price,
      category: product.category,
      description: product.description,
      status: product.status,
      imageUrl: product.imageUrl,
      createdAt: product.createdAt,
      sellerId: product.userId,
      sellerName: user.username,
      sellerContact: user.contact, // 개인정보. 아래에서 로그인한 사람에게만 그린다
    })
    .from(product)
    .innerJoin(user, eq(product.userId, user.id))
    .where(eq(product.id, id));
  return found ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const item = await findProduct(params);
  return { title: item ? `${item.title} · 동네 마켓` : "상품을 찾을 수 없음" };
}

export default async function ProductPage({ params }: PageProps) {
  const item = await findProduct(params);
  if (!item) {
    notFound();
  }

  const me = await getCurrentUser();
  const isOwner = me?.id === item.sellerId; // ?. : 로그인 안 했으면(me 가 null) 그냥 undefined

  return (
    <article className="card product-detail">
      <Image
        src={item.imageUrl}
        alt={item.title}
        width={1280}
        height={960}
        sizes="(max-width: 520px) 100vw, 480px"
        className="product-image"
        priority
      />
      <p className="muted small">
        {item.category} · @{item.sellerName}
      </p>
      <h1>{item.title}</h1>
      <p className="row">
        <strong className="price">{formatPrice(item.price)}</strong>
        <span className={`badge ${item.status}`}>{STATUS_LABELS[item.status]}</span>
      </p>
      {item.description && <p className="description">{item.description}</p>}

      <section className="contact">
        <h2>판매자 연락 방법</h2>
        {/* 서버 컴포넌트는 화면에 그린 것만 브라우저로 보낸다. 로그인하지 않았으면 연락 방법은 아예 전달되지 않는다 */}
        {!me ? (
          <p className="muted">
            <Link href="/login">로그인</Link>하면 판매자 연락 방법을 볼 수 있어요.
          </p>
        ) : item.sellerContact ? (
          <p className="description">{item.sellerContact}</p>
        ) : (
          <p className="muted">판매자가 아직 연락 방법을 적지 않았어요.</p>
        )}
        {isOwner && (
          <p className="muted small">
            내 연락 방법은 <Link href="/dashboard">내 판매 상품</Link>에서 바꿀 수 있어요.
          </p>
        )}
      </section>

      {isOwner && (
        <div className="row owner-actions">
          <Link href={`/products/${item.id}/edit`} className="button">
            수정
          </Link>
          {/* 지금 상태의 반대로 바꾸는 버튼 하나 */}
          <form action={changeStatus}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value={item.status === "selling" ? "sold" : "selling"} />
            <button type="submit" className="secondary">
              {item.status === "selling" ? "거래완료로 변경" : "판매중으로 되돌리기"}
            </button>
          </form>
          <DeleteButton productId={item.id} />
        </div>
      )}
    </article>
  );
}
