import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { product, user } from "@/db/schema";
import { formatPrice, STATUS_LABELS } from "@/lib/product";

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
    </article>
  );
}
