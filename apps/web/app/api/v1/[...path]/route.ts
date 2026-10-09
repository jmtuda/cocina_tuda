import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };

function unavailable(status = 503) {
  return Response.json(
    { message: "La API no está disponible." },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

async function proxy(request: Request, context: Context) {
  const origin = process.env.API_INTERNAL_URL;
  if (
    process.env.VERCEL !== "1" ||
    process.env.VERCEL_ENV !== "production" ||
    !origin
  )
    return unavailable();
  try {
    const base = new URL(origin);
    if (
      base.protocol !== "https:" ||
      base.origin !== origin ||
      base.port ||
      !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(base.hostname) ||
      /^[\d.]+$/.test(base.hostname)
    )
      return unavailable();
  } catch {
    return unavailable();
  }
  const { path } = await context.params;
  const query = new URL(request.url).searchParams;
  if (
    !path.length ||
    path.some((segment) => !/^[a-z0-9_-]+$/i.test(segment)) ||
    [...query.keys()].some((key) => key.toLowerCase().startsWith("x-vercel-"))
  )
    return unavailable(400);
  const url = new URL(
    `/api/v1/${path.map(encodeURIComponent).join("/")}`,
    origin,
  );
  url.search = query.toString();
  if (request.method !== "GET" && request.method !== "HEAD") {
    const requestOrigin = request.headers.get("origin");
    if (
      (requestOrigin && requestOrigin !== new URL(request.url).origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return unavailable(403);
  }
  let token: string;
  try {
    token = await getVercelOidcToken();
    if (!token) return unavailable();
  } catch {
    return unavailable();
  }
  try {
    const headers = new Headers({ "x-vercel-trusted-oidc-idp-token": token });
    let body: ArrayBuffer | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      const payload = await request.arrayBuffer();
      if (payload.byteLength) {
        body = payload;
        const contentType = request.headers.get("content-type");
        if (contentType) headers.set("content-type", contentType);
      }
    }
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });
    if (
      (response.status >= 300 && response.status < 400) ||
      response.status >= 500 ||
      response.headers.get("content-type")?.includes("text/html")
    )
      return unavailable(502);
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return unavailable(502);
  }
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
};
