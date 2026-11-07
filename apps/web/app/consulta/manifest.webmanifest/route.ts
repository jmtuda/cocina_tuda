import type { MetadataRoute } from "next";

const consultationManifest: MetadataRoute.Manifest = {
  id: "/consulta",
  name: "Cocina Tuda · Mis recetas",
  short_name: "Mis recetas",
  description:
    "Consulta de recetas de Cocina Tuda. Requiere conexión y acceso privado.",
  lang: "es",
  start_url: "/consulta",
  scope: "/consulta",
  display: "standalone",
  background_color: "#f5f1e8",
  theme_color: "#b84b2c",
  icons: [
    {
      src: "/consulta/icon?size=192",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/consulta/icon?size=512",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/consulta/icon?size=512",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

export function GET() {
  return Response.json(consultationManifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "private, no-cache",
    },
  });
}
