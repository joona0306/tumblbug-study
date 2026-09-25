"use client";

import { deleteProduct } from "@/app/actions/products";

// 삭제는 되돌릴 수 없으니 한 번 더 묻는다
export default function DeleteButton({ productId }: { productId: number }) {
  function confirmDelete(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("이 상품을 삭제할까요? 사진도 함께 지워지고 되돌릴 수 없어요.")) {
      event.preventDefault(); // "취소"를 누르면 제출하지 않는다
    }
  }

  return (
    <form action={deleteProduct} onSubmit={confirmDelete}>
      <input type="hidden" name="id" value={productId} />
      <button type="submit" className="danger">
        삭제
      </button>
    </form>
  );
}
