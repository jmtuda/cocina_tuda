import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./consultation.css";

export const metadata: Metadata = {
  title: "Mis recetas · Cocina Tuda",
  description: "Consulta privada de recetas, ingredientes y pasos Mambo.",
  applicationName: "Cocina Tuda Consulta",

  appleWebApp: {
    capable: true,
    title: "Mis recetas",
    statusBarStyle: "default",
  },
  icons: { icon: "/consulta/icon?size=192", apple: "/consulta/icon?size=192" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#b84b2c",
  viewportFit: "cover",
};

export default function ConsultationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {/* Production is protected too: the manifest request must include the user's session. */}
      <link
        rel="manifest"
        href="/consulta/manifest.webmanifest"
        crossOrigin="use-credentials"
      />
      {children}
    </>
  );
}
