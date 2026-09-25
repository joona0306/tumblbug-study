// 꼭 있어야 하는 환경 변수를 꺼낸다. 없으면 바로 알아볼 수 있는 에러를 낸다.
// process.env.XXX 의 타입은 string | undefined 라서(없을 수도 있으니까), 이 함수를 거치면 string 이 된다.
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name} 이(가) 없습니다. .env.local 을 확인하세요.`);
  }
  return value;
}
