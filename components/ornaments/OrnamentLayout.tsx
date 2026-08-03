import { FooterSection } from "@/components/FooterSection";

type OrnamentLayoutProps = {
  children: React.ReactNode;
  /** Optional page title for detail views. */
  title?: string;
  /** Lab iframe — no site chrome / footer. */
  embed?: boolean;
};

export function OrnamentLayout({
  children,
  title,
  embed = false,
}: OrnamentLayoutProps) {
  return (
    <div className="bg-paper text-ink">
      <div
        className={
          embed
            ? "mx-auto w-full max-w-[78rem] px-5 pb-10 pt-6 sm:px-8 md:px-10"
            : "mx-auto w-full max-w-[78rem] px-5 pb-24 pt-10 sm:px-8 md:px-10 md:pb-32 md:pt-14"
        }
      >
        {title ? (
          <header className="mb-10 md:mb-14">
            <h1 className="font-serif text-2xl tracking-[-0.05em] text-ink md:text-3xl">
              {title}
            </h1>
          </header>
        ) : null}
        <main>{children}</main>
      </div>
      {embed ? null : <FooterSection />}
    </div>
  );
}
