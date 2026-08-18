import type { Metadata, Viewport } from "next";

import "./globals.css";
import { boot } from "@/lib/boot";

boot();

export const metadata: Metadata = {
  title: "Matematik Macerası",
  description:
    "Oyun oynayarak matematik öğren: ritmik sayma, çarpım tablosu, düellolar, ligler, başarımlar ve daha fazlası.",
  applicationName: "Matematik Macerası",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#3568F0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
