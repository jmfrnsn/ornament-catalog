import Image from "next/image";

export function FooterSection() {
  return (
    <footer className="relative overflow-hidden pb-16 md:pb-24">
      <p
        className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap font-display text-[clamp(3.5rem,18vw,16rem)] text-black/10 md:top-8"
        aria-hidden="true"
      >
        JadeFranson
      </p>

      <div className="relative mx-auto flex w-full max-w-[40rem] flex-col items-center px-6 pt-24 md:px-8 md:pt-32">
        <div className="relative aspect-[950/632] w-full max-w-[40rem]">
          <Image
            src="/images/footer-illustration.png"
            alt="Decorative illustration of a hand holding flowers"
            fill
            sizes="(max-width: 768px) 85vw, 640px"
            className="object-contain"
          />
        </div>
      </div>
    </footer>
  );
}
