import type { Metadata } from "next";

import "./globals.css";
import { display, mono, serif } from "@/lib/site-fonts";

export const metadata: Metadata = {
  title: {
    default: "Ornaments",
    template: "%s — Ornaments",
  },
  description: "A catalog of historical ornament sources.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper font-serif text-base text-ink">
        {children}
      </body>
    </html>
  );
}
