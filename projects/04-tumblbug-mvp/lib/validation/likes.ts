import { z } from "zod";

// 찜 API 입력 검사 (9주차 API 규칙: 잘못된 값이면 400 + 칸마다 이유)
export const projectIdSchema = z.coerce.number({ error: "프로젝트 번호는 숫자여야 해요" }).int({ error: "프로젝트 번호는 정수여야 해요" }).positive({ error: "프로젝트 번호가 올바르지 않아요" });

export const likeBodySchema = z.object({ projectId: projectIdSchema });
