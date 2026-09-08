"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

function needsDirectLoad(src: string) {
  try {
    const { hostname } = new URL(src);
    // Art Institute IIIF blocks Next's image optimizer (non-browser UA → 403).
    return hostname === "www.artic.edu" || hostname === "artic.edu";
  } catch {
    return false;
  }
}

type OrnamentImageProps = Omit<ImageProps, "src"> & {
  src: string;
  /** Multiply into paper by default; use "normal" on dark gallery grounds. */
  blend?: "multiply" | "normal";
};

export function OrnamentImage({
  src,
  alt,
  className,
  blend = "multiply",
  onError,
  ...props
}: OrnamentImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const blendClass =
    blend === "multiply" ? "ornament-plate-image" : undefined;

  if (failedSrc === src) {
    return (
      <span
        role="img"
        aria-label={alt ? `${alt}: image unavailable` : "Image unavailable"}
        className={`flex items-center justify-center bg-ink/5 p-1 text-center font-mono text-[10px] text-ink/60 ${props.fill ? "absolute inset-0" : ""}`}
      >
        {alt ? "Image unavailable" : "—"}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={needsDirectLoad(src)}
      onError={(event) => { setFailedSrc(src); onError?.(event); }}
      className={[blendClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
