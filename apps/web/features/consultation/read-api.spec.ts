import { afterEach, describe, expect, it, vi } from "vitest";
import { readConsultation } from "./read-api";
import { consultationHref, consultationQuery } from "./navigation";
import { GET as manifest } from "../../app/consulta/manifest.webmanifest/route";
import { renderToStaticMarkup } from "react-dom/server";
import ConsultationLayout, { metadata } from "../../app/consulta/layout";

afterEach(() => vi.unstubAllGlobals());

it("includes session credentials for the protected manifest in production", () => {
  const html = renderToStaticMarkup(
    ConsultationLayout({ children: "consulta" }),
  );
  expect(html).toMatch(/rel="manifest"/);
  expect(html).toMatch(/crossorigin="use-credentials"/i);
  expect(html.match(/rel="manifest"/g)).toHaveLength(1);
  expect(metadata.manifest).toBeUndefined();
});

describe("consultation read contract", () => {
  it.each([
    "/recipes?status=ACTIVE&page=1",
    "/recipes/recipe-1",
    "/classifications/categories",
  ])("uses GET only, same-origin and no-store: %s", async (path) => {
    const mock = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", mock);
    const controller = new AbortController();
    expect(await readConsultation(path, controller.signal)).toEqual({
      ok: true,
    });
    expect(mock).toHaveBeenCalledWith(`/api/v1${path}`, {
      method: "GET",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
  });
  it.each([
    "/imports/confirmations",
    "/recipes/recipe-1/archive",
    "https://other.example/recipes",
    "/catalog/ingredients",
  ])("refuses non-consultation endpoints: %s", async (path) => {
    const mock = vi.fn();
    vi.stubGlobal("fetch", mock);
    await expect(
      readConsultation(path, new AbortController().signal),
    ).rejects.toThrow("Consulta no permitida");
    expect(mock).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 503])("reports failed reads: %s", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({}, { status })),
    );
    await expect(
      readConsultation("/recipes/recipe-1", new AbortController().signal),
    ).rejects.toThrow();
  });
  it("rejects HTML login pages rather than treating them as recipe data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>login</html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    await expect(
      readConsultation("/recipes", new AbortController().signal),
    ).rejects.toThrow("sesión");
  });
});

it("roundtrips search/category/page/detail through history URLs", () => {
  const query = {
    q: "tomate y arroz",
    category: "category-1",
    page: 2,
    recipe: "recipe-1",
  };
  const href = consultationHref(query);
  expect(href).toMatch(/^\/consulta\?/);
  expect(consultationQuery(href.split("?")[1])).toEqual(query);
  expect(consultationQuery("?page=-1").page).toBe(1);
  expect(consultationQuery("?page=1.5").page).toBe(1);
});

it("defines a standalone app scoped to consultation with real icon endpoints", async () => {
  const response = manifest();
  const body = await response.json();
  expect(response.headers.get("content-type")).toContain(
    "application/manifest+json",
  );
  expect(body).toMatchObject({
    start_url: "/consulta",
    scope: "/consulta",
    display: "standalone",
  });
  expect(body.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
  expect(
    body.icons.every((icon: { src: string }) =>
      icon.src.startsWith("/consulta/icon"),
    ),
  ).toBe(true);
});
