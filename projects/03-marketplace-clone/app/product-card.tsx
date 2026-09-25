import Image from "next/image";
import Link from "next/link";
import { formatPrice, STATUS_LABELS } from "@/lib/product";
import type { ProductCardData } from "@/lib/queries";

// 목록에서 상품 1개를 보여주는 카드
export default function ProductCard({ item }: { item: ProductCardData }) {
  return (
    <Link href={`/products/${item.id}`} className={`product-card ${item.status}`}>
      <Image
        src={item.imageUrl}
        alt={item.title}
        width={400}
        height={300}
        sizes="(max-width: 520px) 50vw, 240px"
        className="card-image"
      />
      <span className="card-title">{item.title}</span>
      <span className="card-price">{formatPrice(item.price)}</span>
      <span className="muted small">
        {item.category}
        {item.status === "sold" && ` · ${STATUS_LABELS.sold}`}
      </span>
    </Link>
  );
}
