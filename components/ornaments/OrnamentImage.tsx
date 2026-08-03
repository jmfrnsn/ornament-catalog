import Image, { type ImageProps } from "next/image";

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
  ...props
}: OrnamentImageProps) {
  const blendClass =
    blend === "multiply" ? "ornament-plate-image" : undefined;

  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={needsDirectLoad(src)}
      className={[blendClass, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
