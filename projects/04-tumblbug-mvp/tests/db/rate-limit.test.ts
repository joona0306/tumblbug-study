import { afterAll, describe, expect, it } from "vitest";
import { clientIp, consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { closePool, withRollback } from "./helpers";

afterAll(closePool);

describe("consumeRateLimit", () => {
  it("한도까지는 통과, 넘으면 막고, 다른 키는 따로 센다", () =>
    withRollback(async (db) => {
      const key = `test:${Date.now()}`;
      const results = [];
      for (let i = 0; i < 4; i++) results.push(await consumeRateLimit(db, key, 3, 60));
      expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
      expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
      expect(rateLimitHeaders(results[3])["Retry-After"]).toMatch(/^\d+$/);

      const other = await consumeRateLimit(db, `${key}:other`, 3, 60);
      expect(other.allowed).toBe(true);
    }));

  it("연달아 여러 번 와도 하나도 빠짐없이 센다 (ON CONFLICT DO UPDATE)", () =>
    withRollback(async (db) => {
      const key = `test-concurrent:${Date.now()}`;
      const results = await Promise.all(Array.from({ length: 5 }, () => consumeRateLimit(db, key, 100, 60)));
      expect(results.map((r) => r.remaining).sort((a, b) => a - b)).toEqual([95, 96, 97, 98, 99]);
    }));
});

describe("clientIp", () => {
  it("x-forwarded-for 의 맨 앞 IP", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
