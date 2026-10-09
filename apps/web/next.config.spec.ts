import { afterEach, expect, it, vi } from "vitest";
import config from "./next.config";

afterEach(() => vi.unstubAllEnvs());

it("keeps the localhost API rewrite for local development", async () => {
  vi.stubEnv("VERCEL", "");
  expect(await config.rewrites!()).toEqual([
    {
      source: "/api/v1/:path*",
      destination: "http://127.0.0.1:3001/api/v1/:path*",
    },
  ]);
});

it("does not bypass the protected route handler with a localhost rewrite on Vercel", async () => {
  vi.stubEnv("VERCEL", "1");
  expect(await config.rewrites!()).toEqual([]);
});
