"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type OrnamentEmbedScopeProps = {
  children: React.ReactNode;
  className?: string;
};

function isCatalogPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/sources") ||
    pathname.startsWith("/motifs") ||
    pathname.startsWith("/projects")
  );
}

/** Keeps lab iframe browsing inside the catalog with ?embed=1. */
export function OrnamentEmbedScope({
  children,
  className,
}: OrnamentEmbedScopeProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isCatalogPath(pathname)) {
      router.replace("/?embed=1");
    }
  }, [pathname, router]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) {
        event.preventDefault();
        return;
      }

      if (!isCatalogPath(url.pathname)) {
        event.preventDefault();
        return;
      }

      if (url.searchParams.get("embed") === "1") return;

      event.preventDefault();
      url.searchParams.set("embed", "1");
      router.push(`${url.pathname}${url.search}${url.hash}`);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return (
    <div data-ornament-embed className={className}>
      {children}
    </div>
  );
}
