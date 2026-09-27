import { z } from "zod";

// 브라우저가 알려 주는 단계만 받는다. 결제 요청·결제 완료는 서버가 직접 기록한다 (브라우저가 "결제 완료"를 꾸며 보낼 수 없게)
export const funnelBodySchema = z.object({
  projectId: z.number().int().positive(),
  step: z.enum(["view", "reward", "shipping"]),
});
