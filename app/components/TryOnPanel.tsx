"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  captureAndShareNode,
  loadImageAsObjectUrl,
  shareOrDownloadUrl,
  supportsFileShare,
} from "../../lib/shareTryOnImage";

type Status = "idle" | "uploading" | "result" | "error";

export default function TryOnPanel({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const { status: sessionStatus } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [canComposite, setCanComposite] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  function reset() {
    if (displayUrl?.startsWith("blob:")) URL.revokeObjectURL(displayUrl);
    setStatus("idle");
    setErrorMessage(null);
    setDisplayUrl(null);
    setCanComposite(false);
    setShareState("idle");
    setShareMessage(null);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setStatus("uploading");
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("productId", String(productId));

    try {
      const response = await fetch("/api/try-on", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data.imageUrl !== "string") {
        setErrorMessage(
          typeof data.error === "string" ? data.error : "Something went wrong. Please try again."
        );
        setStatus("error");
        return;
      }

      try {
        setDisplayUrl(await loadImageAsObjectUrl(data.imageUrl));
        setCanComposite(true);
      } catch {
        // Cross-origin result host didn't allow us to fetch the bytes for
        // compositing -- still show the image directly, just skip the
        // branded footer and fall back to a plain share/download later.
        setDisplayUrl(data.imageUrl);
        setCanComposite(false);
      }
      setStatus("result");
    } catch {
      setErrorMessage("Virtual try-on is temporarily unavailable. Please try again shortly.");
      setStatus("error");
    }
  }

  async function handleShare() {
    if (!displayUrl) return;
    setShareState("working");
    setShareMessage(null);

    try {
      const outcome =
        canComposite && captureRef.current
          ? await captureAndShareNode(captureRef.current, "try-on-result.png")
          : await shareOrDownloadUrl(displayUrl, "try-on-result.png");

      setShareState("done");
      setShareMessage(outcome === "downloaded" ? "Downloaded ✓" : "Shared ✓");
    } catch (err) {
      setShareState("error");
      setShareMessage(err instanceof Error ? err.message : "Couldn't share this image.");
    }
  }

  if (sessionStatus === "loading") return null;

  if (sessionStatus !== "authenticated") {
    return (
      <div className="rounded-2xl border-2 border-dashed border-pink-200 px-4 py-3 text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-pink-500 hover:text-pink-600">
          Log in
        </Link>{" "}
        to try this on virtually.
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border-2 border-pink-500 px-6 py-2.5 text-sm font-semibold text-pink-500 transition-colors hover:bg-pink-50"
        >
          👗 Try It On
        </button>
      )}

      {status === "uploading" && (
        <p className="text-sm font-medium text-slate-500">
          Generating your try-on... this can take up to a minute.
        </p>
      )}

      {status === "error" && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-600">{errorMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-2 text-sm font-semibold text-pink-500 hover:text-pink-600"
          >
            Try again
          </button>
        </div>
      )}

      {status === "result" && displayUrl && (
        <div className="flex flex-col items-start gap-3">
          <div
            ref={captureRef}
            className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- remote/blob source, next/image can't optimize this */}
            <img src={displayUrl} alt={`Virtual try-on: ${productName}`} className="block max-w-xs" />
            <div className="flex items-center justify-center gap-2 bg-pink-500 py-2">
              <span aria-hidden="true">🛍️</span>
              <span className="text-sm font-semibold text-white">Try it on Happy Shopping</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleShare}
              disabled={shareState === "working"}
              className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {shareState === "working"
                ? "Preparing..."
                : supportsFileShare()
                  ? "Share"
                  : "Download Image"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Try another photo
            </button>
            {shareMessage && (
              <span
                className={`text-sm font-medium ${shareState === "error" ? "text-red-500" : "text-slate-500"}`}
              >
                {shareMessage}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
