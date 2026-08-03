"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OrnamentAdminLoginFormProps = {
  initiallyAuthenticated?: boolean;
};

export function OrnamentAdminLoginForm({
  initiallyAuthenticated = false,
}: OrnamentAdminLoginFormProps) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to sign in");
      }

      setAuthenticated(true);
      setSecret("");
      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in",
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleLogout() {
    setIsPending(true);
    setError(null);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
      router.refresh();
    } catch {
      setError("Unable to sign out");
    } finally {
      setIsPending(false);
    }
  }

  if (authenticated) {
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <p className="font-serif text-base leading-relaxed text-ink/70">
          Signed in. Archive buttons are visible on each figure in the catalog.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a
            href="/"
            className="font-mono text-sm font-extralight uppercase tracking-[0.08em] text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
          >
            Catalog →
          </a>
          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            disabled={isPending}
            className="font-mono text-sm font-extralight uppercase tracking-[0.08em] text-ink/55 transition-colors hover:text-ink disabled:opacity-50"
          >
            {isPending ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {error ? (
          <p className="font-serif text-sm text-ink/80">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs font-extralight uppercase tracking-[0.08em] text-ink/40">
          Secret
        </span>
        <input
          type="password"
          name="secret"
          autoComplete="current-password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          className="border border-ink/15 bg-paper px-3 py-2 font-serif text-base text-ink outline-none transition-colors focus:border-ink/40"
          required
        />
      </label>
      <button
        type="submit"
        disabled={isPending || !secret.trim()}
        className="w-fit font-mono text-sm font-extralight uppercase tracking-[0.08em] text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      {error ? <p className="font-serif text-sm text-ink/80">{error}</p> : null}
    </form>
  );
}
