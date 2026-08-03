"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveSourceButtonProps = {
  sourceId: string;
  archived: boolean;
  onCompleted?: (nextArchived: boolean) => void;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

async function postArchiveAction(sourceId: string, archived: boolean) {
  const endpoint = archived
    ? `/api/sources/${sourceId}/unarchive`
    : `/api/sources/${sourceId}/archive`;

  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
  });

  const body = (await response.json().catch(() => ({}))) as ApiErrorBody & {
    ok?: boolean;
    dispatched?: boolean;
    exportPatched?: boolean;
  };

  if (!response.ok) {
    const error = new Error(body.error?.message ?? "Request failed") as Error & {
      code?: string;
      status?: number;
    };
    error.code = body.error?.code;
    error.status = response.status;
    throw error;
  }

  return body;
}

export function ArchiveSourceButton({
  sourceId,
  archived,
  onCompleted,
}: ArchiveSourceButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<"active" | "archived">(
    archived ? "archived" : "active",
  );
  const [error, setError] = useState<string | null>(null);

  const isArchived = status === "archived";
  const actionLabel = isArchived ? "Restore" : "Archive";

  async function runAction() {
    if (isPending) return;

    const previousArchived = isArchived;
    const nextArchived = !isArchived;

    setError(null);
    setIsPending(true);
    setStatus(nextArchived ? "archived" : "active");
    // Leave the grid immediately; roll back only if the request fails.
    onCompleted?.(nextArchived);

    try {
      await postArchiveAction(sourceId, previousArchived);
      router.refresh();
    } catch (actionError) {
      setStatus(previousArchived ? "archived" : "active");
      onCompleted?.(previousArchived);

      const code =
        actionError && typeof actionError === "object" && "code" in actionError
          ? String((actionError as { code?: string }).code)
          : undefined;

      if (code === "UNAUTHORIZED") {
        setError("Sign in at /admin");
        return;
      }

      if (code === "MISSING_ENV") {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Missing Notion env on host",
        );
        return;
      }

      setError(
        actionError instanceof Error
          ? actionError.message
          : `Unable to ${actionLabel.toLowerCase()}`,
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void runAction();
        }}
        disabled={isPending}
        className="border border-ink/20 bg-paper px-2.5 py-1.5 font-mono text-xs font-extralight uppercase tracking-[0.08em] text-ink shadow-sm transition-opacity hover:border-ink disabled:cursor-wait disabled:opacity-50"
      >
        {isPending ? `${actionLabel}…` : actionLabel}
      </button>
      {error ? (
        <p className="max-w-[12rem] bg-paper/95 px-2 py-1 text-right font-serif text-xs leading-snug text-ink/80">
          {error}
        </p>
      ) : null}
    </div>
  );
}
