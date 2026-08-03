import type { Metadata } from "next";

import { OrnamentEmbedScope } from "@/components/ornaments/OrnamentEmbedScope";
import { OrnamentLayout } from "@/components/ornaments/OrnamentLayout";
import { SourceList } from "@/components/ornaments/SourceList";
import { listExportedSources } from "@/lib/ornaments/sources-export";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ornaments",
  description: "A catalog of historical ornament sources.",
};

type OrnamentsPageProps = {
  searchParams: Promise<{ embed?: string }>;
};

export default async function OrnamentsPage({
  searchParams,
}: OrnamentsPageProps) {
  const { embed } = await searchParams;
  const isEmbed = embed === "1";
  const sources = listExportedSources({ view: "active" });
  const list = <SourceList sources={sources} embed={isEmbed} />;

  if (isEmbed) {
    return (
      <OrnamentEmbedScope className="h-full min-h-full w-full max-w-full bg-paper text-ink">
        {list}
      </OrnamentEmbedScope>
    );
  }

  return <OrnamentLayout>{list}</OrnamentLayout>;
}
