// Importing globals.css is what pulls the Tailwind theme into Next's CSS
// pipeline (compiled, hashed, and linked into the document head). PageRenderer
// owns <html>/<head>, but Next 16 hoists imported stylesheets into the
// rendered head via React's stylesheet precedence, so the link lands beside
// the site's recipe sheet.
import "./globals.css";
import "./tool-extras.css";

import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Page components render the full document (html/head/body), the way this
  // template's renderer did; this layout is the passthrough that pulls in the
  // site stylesheet. Pages own their metadata.
  return children;
}
