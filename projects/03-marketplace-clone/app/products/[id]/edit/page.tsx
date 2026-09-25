import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { updateProduct } from "@/app/actions/products";
import { db } from "@/db";
import { product } from "@/db/schema";
import { requireUser } from "@/lib/session";
import ProductForm from "../../product-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const me = await requireUser();
  const id = Number((await params).id);

  // 내 상품만 수정 화면을 연다. 남의 상품이면 "없는 페이지"처럼 보여준다
  const [item] = Number.isInteger(id)
    ? await db
        .select()
        .from(product)
        .where(and(eq(product.id, id), eq(product.userId, me.id)))
    : [];
  if (!item) {
    notFound();
  }

  return (
    <div className="card">
      <h1>상품 수정</h1>
      <ProductForm
        action={updateProduct}
        submitLabel="수정하기"
        currentImageUrl={item.imageUrl}
        initialValues={{
          title: item.title,
          price: String(item.price), // 폼 칸에는 글자로 넣는다
          category: item.category,
          description: item.description,
        }}
      >
        <input type="hidden" name="id" value={item.id} />
      </ProductForm>
    </div>
  );
}
