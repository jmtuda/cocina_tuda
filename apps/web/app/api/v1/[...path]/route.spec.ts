import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@vercel/oidc", () => ({ getVercelOidcToken: vi.fn() }));
import { getVercelOidcToken } from "@vercel/oidc";
import { GET, POST, PUT, PATCH, DELETE, HEAD } from "./route";

const context = { params: Promise.resolve({ path: ["health"] }) };
const upstream = vi.fn();
beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("API_INTERNAL_URL", "");
  vi.stubGlobal("fetch", upstream);
  upstream
    .mockReset()
    .mockImplementation(async () => Response.json({ status: "ok" }));
  vi.mocked(getVercelOidcToken).mockReset().mockResolvedValue("server-token");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("fails closed without the server API origin", async () => {
  const response = await GET(
    new Request("https://web.example/api/v1/health"),
    context,
  );
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(upstream).not.toHaveBeenCalled();
  expect(getVercelOidcToken).not.toHaveBeenCalled();
});

it("uses the server origin and obtains a fresh OIDC token per request", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  vi.mocked(getVercelOidcToken)
    .mockResolvedValueOnce("first-token")
    .mockResolvedValueOnce("second-token");
  upstream.mockImplementation(async () => Response.json({ status: "ok" }));
  for (const token of ["first-token", "second-token"]) {
    const response = await GET(
      new Request(
        "https://web.example/api/v1/health?name=arroz%20integral&page=2",
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    const [url, init] = upstream.mock.lastCall!;
    expect(String(url)).toBe(
      "https://api.example/api/v1/health?name=arroz+integral&page=2",
    );
    expect(
      new Headers(init.headers).get("x-vercel-trusted-oidc-idp-token"),
    ).toBe(token);
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("manual");
  }
  expect(getVercelOidcToken).toHaveBeenCalledTimes(2);
});

it.each(["preview", "development", "", "custom"])(
  "rejects hosted %s before obtaining credentials or contacting the API",
  async (environment) => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.example");
    vi.stubEnv("VERCEL_ENV", environment);
    expect(
      (await GET(new Request("https://web.example/api/v1/health"), context))
        .status,
    ).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
    expect(getVercelOidcToken).not.toHaveBeenCalled();
  },
);

it.each([
  "http://api.example",
  "https://api.example/path",
  "https://api.example?secret=1",
  "https://api.example#fragment",
  "https://user:pass@api.example",
  "https://127.0.0.1",
  "https://localhost",
  "https://api.example:444",
  "not a URL",
])("rejects invalid server origin %s", async (origin) => {
  vi.stubEnv("API_INTERNAL_URL", origin);
  expect(
    (await GET(new Request("https://web.example/api/v1/health"), context))
      .status,
  ).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
  expect(getVercelOidcToken).not.toHaveBeenCalled();
});

it("does not use OIDC or remote origins outside Vercel", async () => {
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  expect(
    (await GET(new Request("http://localhost/api/v1/health"), context)).status,
  ).toBe(503);
  expect(upstream).not.toHaveBeenCalled();
  expect(getVercelOidcToken).not.toHaveBeenCalled();
});

it.each(["missing", "throws"])(
  "fails closed when OIDC %s without forwarding private errors",
  async (failure) => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.example");
    if (failure === "missing")
      vi.mocked(getVercelOidcToken).mockResolvedValue("");
    else
      vi.mocked(getVercelOidcToken).mockRejectedValue(
        new Error("private-token-detail"),
      );
    const response = await GET(
      new Request("https://web.example/api/v1/health"),
      context,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-token-detail");
    expect(upstream).not.toHaveBeenCalled();
  },
);

it("returns a generic uncached error on network failure", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  upstream.mockRejectedValue(new Error("private-db-or-token-detail"));
  const response = await GET(
    new Request("https://web.example/api/v1/health"),
    context,
  );
  expect(response.status).toBe(502);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.text()).not.toContain("private-db-or-token-detail");
});

it.each([
  ".",
  "..",
  "../health",
  "%2e%2e",
  "%252e%252e",
  "//evil.example",
  "https://evil.example",
  "health?secret=1",
  "health#fragment",
  "health\\other",
  "",
  "health/other",
])("rejects unsafe path segment %s before getting a token", async (segment) => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const response = await GET(new Request("https://web.example/api/v1/health"), {
    params: Promise.resolve({ path: [segment] }),
  });
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
  expect(getVercelOidcToken).not.toHaveBeenCalled();
});

it.each([
  "x-vercel-protection-bypass",
  "X-Vercel-Protection-Bypass",
  "x-vercel-set-bypass-cookie",
  "x-vercel-trusted-oidc-idp-token",
])("rejects reserved query parameter %s", async (key) => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const response = await GET(
    new Request(
      `https://web.example/api/v1/health?${encodeURIComponent(key)}=attacker`,
    ),
    context,
  );
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
  expect(getVercelOidcToken).not.toHaveBeenCalled();
});

it("never forwards client credentials, cookies, routing or bypass headers", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const headers = {
    cookie: "private-session=attacker",
    authorization: "Bearer attacker",
    "x-vercel-protection-bypass": "attacker",
    "x-vercel-trusted-oidc-idp-token": "attacker",
    "x-vercel-oidc-token": "attacker",
    "x-forwarded-host": "evil.example",
    "x-http-method-override": "DELETE",
    host: "evil.example",
  };
  const response = await GET(
    new Request("https://web.example/api/v1/health", { headers }),
    context,
  );
  expect(response.status).toBe(200);
  expect(
    Object.fromEntries(new Headers(upstream.mock.lastCall![1].headers)),
  ).toEqual({ "x-vercel-trusted-oidc-idp-token": "server-token" });
});

it.each([
  ["POST", POST],
  ["PUT", PUT],
  ["PATCH", PATCH],
  ["DELETE", DELETE],
] as const)(
  "preserves %s JSON bodies, nested routes, status and only safe headers",
  async (method, handler) => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.example");
    const body = '{"quantity":"125.500","optional":true}';
    upstream.mockResolvedValue(
      Response.json(
        { quantity: "125.500" },
        {
          status: 201,
          headers: {
            "Set-Cookie": "secret=1",
            "x-vercel-trusted-oidc-idp-token": "private",
            "x-vercel-oidc-token": "private",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=300",
          },
        },
      ),
    );
    const response = await handler(
      new Request("https://web.example/api/v1/shopping-lists/id/lines", {
        method,
        headers: { "Content-Type": "application/json", cookie: "private=1" },
        body,
      }),
      { params: Promise.resolve({ path: ["shopping-lists", "id", "lines"] }) },
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ quantity: "125.500" });
    const [url, init] = upstream.mock.lastCall!;
    expect(String(url)).toBe(
      "https://api.example/api/v1/shopping-lists/id/lines",
    );
    expect(init.method).toBe(method);
    expect(new TextDecoder().decode(init.body)).toBe(body);
    expect(Object.fromEntries(new Headers(init.headers))).toEqual({
      "content-type": "application/json",
      "x-vercel-trusted-oidc-idp-token": "server-token",
    });
    expect(Object.fromEntries(response.headers)).toEqual({
      "cache-control": "private, no-store",
      "content-type": "application/json",
    });
  },
);

it("preserves DELETE without a body and 204 responses", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  upstream.mockResolvedValue(new Response(null, { status: 204 }));
  const response = await DELETE(
    new Request("https://web.example/api/v1/health", { method: "DELETE" }),
    context,
  );
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(upstream.mock.lastCall![1].body).toBeUndefined();
});

it("HEAD has no request or response body", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const response = await HEAD(
    new Request("https://web.example/api/v1/health", { method: "HEAD" }),
    context,
  );
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("");
  expect(upstream.mock.lastCall![1].body).toBeUndefined();
});

it.each([301, 302, 307, 308, 500, 503])(
  "does not relay upstream %s private errors or redirects",
  async (status) => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.example");
    upstream.mockResolvedValue(
      new Response("private-token-detail", {
        status,
        headers: { location: "https://evil.example", "set-cookie": "secret=1" },
      }),
    );
    const response = await GET(
      new Request("https://web.example/api/v1/health"),
      context,
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.text()).not.toContain("private-token-detail");
    expect(upstream).toHaveBeenCalledTimes(1);
  },
);

it("rejects upstream HTML protection/login responses", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  upstream.mockResolvedValue(
    new Response("private protection page", {
      status: 401,
      headers: { "content-type": "text/html" },
    }),
  );
  const response = await GET(
    new Request("https://web.example/api/v1/health"),
    context,
  );
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("private protection page");
});

it("preserves JSON validation errors for the existing client", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  upstream.mockResolvedValue(
    Response.json({ message: ["name should not be empty"] }, { status: 400 }),
  );
  const response = await GET(
    new Request("https://web.example/api/v1/health"),
    context,
  );
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    message: ["name should not be empty"],
  });
});

it.each(["https://evil.example", "null"])(
  "rejects cross-origin mutation from %s before calling the API",
  async (origin) => {
    vi.stubEnv("API_INTERNAL_URL", "https://api.example");
    const response = await POST(
      new Request("https://web.example/api/v1/recipes", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: '{"name":"unsafe"}',
      }),
      { params: Promise.resolve({ path: ["recipes"] }) },
    );
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
    expect(getVercelOidcToken).not.toHaveBeenCalled();
  },
);

it("rejects browser cross-site mutation even without Origin", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const response = await DELETE(
    new Request("https://web.example/api/v1/recipes/id", {
      method: "DELETE",
      headers: { "sec-fetch-site": "cross-site" },
    }),
    { params: Promise.resolve({ path: ["recipes", "id"] }) },
  );
  expect(response.status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});

it("accepts same-origin browser mutations", async () => {
  vi.stubEnv("API_INTERNAL_URL", "https://api.example");
  const response = await POST(
    new Request("https://web.example/api/v1/recipes", {
      method: "POST",
      headers: {
        origin: "https://web.example",
        "sec-fetch-site": "same-origin",
        "Content-Type": "application/json",
      },
      body: '{"name":"safe"}',
    }),
    { params: Promise.resolve({ path: ["recipes"] }) },
  );
  expect(response.status).toBe(200);
  expect(upstream).toHaveBeenCalledTimes(1);
});
