import { createProduct } from "@/app/actions/products";
import { requireUser } from "@/lib/session";
import ProductForm from "../product-form";

export default async function NewProductPage() {
  // 로그인한 사람만 상품을 올릴 수 있다
  await requireUser();

  return (
    <div className="card">
      <h1>내 물건 팔기</h1>
      <ProductForm action={createProduct} submitLabel="등록하기" />
    </div>
  );
}
