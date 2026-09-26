import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import figma from "../design/figma-tokens.json";

// Figma 토큰(design/figma-tokens.json)과 app/globals.css가 같은지 확인한다.
// 누군가 CSS 색만 바꾸거나 Figma만 바꾸면 이 테스트가 실패해서 CI가 알려준다.

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");

// "--이름: 값;" 줄을 모두 꺼내 { 이름: 값 } 으로 만든다
function readVariables(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const lightVars = readVariables(css.slice(0, darkStart));
const darkVars = { ...lightVars, ...readVariables(css.slice(darkStart)) };

// var(--red-600) 처럼 다른 변수를 가리키면 끝까지 따라가서 실제 값을 찾는다
function resolve(vars: Record<string, string>, name: string): string {
  let value = vars[name];
  for (let i = 0; value?.startsWith("var(") && i < 5; i++) {
    value = vars[value.slice(4, -1).trim()];
  }
  return (value ?? "(없음)").toLowerCase();
}

describe("Figma 색 토큰 = CSS 변수", () => {
  for (const [name, { light, dark }] of Object.entries(figma.colors)) {
    it(`${name} (라이트·다크)`, () => {
      expect(resolve(lightVars, name)).toBe(light.toLowerCase());
      expect(resolve(darkVars, name)).toBe(dark.toLowerCase());
    });
  }
});

describe("Figma 간격·모서리 토큰 = CSS 변수", () => {
  for (const [name, px] of Object.entries(figma.sizes)) {
    it(`${name} = ${px}px`, () => {
      expect(resolve(lightVars, name)).toBe(`${px}px`);
    });
  }
});
