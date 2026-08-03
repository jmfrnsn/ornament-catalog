import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrnamentEmbedScope } from "@/components/ornaments/OrnamentEmbedScope";
import { OrnamentImage } from "@/components/ornaments/OrnamentImage";
import { OrnamentLayout } from "@/components/ornaments/OrnamentLayout";
import {
  getExportedSource,
  loadOrnamentSourcesExport,
} from "@/lib/ornaments/sources-export";

type SourceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export function generateStaticParams() {
  return loadOrnamentSourcesExport().sources.map((source) => ({
    id: source.id,
  }));
}

export async function generateMetadata({
  params,
}: SourceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const source = getExportedSource(id);
  if (!source) {
    return { title: "Not found" };
  }

  return {
    title: ``,
    description: `${source.creator}, ${source.year}. ${source.era}${
      source.region ? `, ${source.region}` : ""
    }.`,
  };
}

export default async function OrnamentSourceDetailPage({
  params,
  searchParams,
}: SourceDetailPageProps) {
  const { id } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const source = getExportedSource(id);
  if (!source) {
    notFound();
  }

  const meta = [
    { label: "Creator", value: source.creator },
    { label: "Date", value: source.year },
    { label: "Era", value: source.era },
    { label: "Region", value: source.region },
    { label: "Collection", value: source.type },
  ].filter((entry) => Boolean(entry.value));

  const catalogHref = isEmbed ? "/?embed=1" : "/";

  const body = (
    <OrnamentLayout title={source.title} embed={isEmbed}>
      <div className="mb-8">
        <Link
          href={catalogHref}
          className="font-serif text-sm tracking-[-0.03em] text-ink/50 transition-colors hover:text-ink"
        >
          ← Catalog
        </Link>
      </div>

      <article className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-transparent">
          {source.imageUrl ? (
            <OrnamentImage
              src={source.imageUrl}
              alt={source.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-serif text-sm text-ink/40">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-8">
          <dl className="flex flex-col gap-4">
            {meta.map((entry) => (
              <div key={entry.label} className="flex flex-col gap-1">
                <dt className="font-serif text-xs tracking-[-0.02em] text-ink/40">
                  {entry.label}
                </dt>
                <dd className="font-serif text-base text-ink">{entry.value}</dd>
              </div>
            ))}
          </dl>

          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="font-serif text-sm tracking-[-0.03em] text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
            >
              View object →
            </a>
          ) : null}
        </div>
      </article>
    </OrnamentLayout>
  );

  if (isEmbed) {
    return (
      <OrnamentEmbedScope className="h-full min-h-full w-full max-w-full bg-paper text-ink">
        {body}
      </OrnamentEmbedScope>
    );
  }

  return body;
}
