// 브라우저에서만 쓰는 사진 도우미. (canvas 는 브라우저에만 있다)

const MAX_WIDTH = 1280; // 가로 최대 1280px. 휴대폰 화면에서 충분히 선명한 크기
const JPEG_QUALITY = 0.8; // 0~1. 0.8 이면 눈으로 차이를 느끼기 어려우면서 용량은 크게 준다

// 휴대폰 사진(보통 3~10MB)을 가로 1280px JPEG(보통 0.2~0.5MB)로 줄인다.
// 서버 액션의 요청 크기 제한을 넘지 않게 하고, 저장 용량과 로딩 시간도 아낀다.
export async function resizeImage(file: File): Promise<File> {
  // createImageBitmap: 사진 파일을 그림 데이터로 읽는다. 휴대폰의 회전 정보(EXIF)도 반영한다.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const scale = Math.min(1, MAX_WIDTH / bitmap.width); // 이미 작으면 키우지 않는다
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  // 보이지 않는 도화지(canvas)에 줄인 크기로 그린 뒤 JPEG 로 저장한다
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이 브라우저에서는 사진을 줄일 수 없어요.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) {
    throw new Error("사진을 변환하지 못했어요.");
  }
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
