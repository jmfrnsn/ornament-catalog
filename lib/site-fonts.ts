import localFont from "next/font/local";
import { Pinyon_Script } from "next/font/google";

export const display = Pinyon_Script({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const serif = localFont({
  src: "../public/fonts/TeXGyreSchola-Regular.woff",
  variable: "--font-serif",
  display: "swap",
  fallback: ["Times New Roman", "serif"],
});

export const mono = localFont({
  src: "../public/fonts/pp-supply-mono.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "200",
  fallback: ["ui-monospace", "monospace"],
});
