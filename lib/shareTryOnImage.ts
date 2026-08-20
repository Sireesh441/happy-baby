import { toBlob } from "html-to-image";

export type ShareOutcome = "shared" | "downloaded";

/**
 * The try-on result image is served from a Hugging Face Space's temp-file
 * host (see happy-baby-tryon-service), which is cross-origin and not
 * guaranteed to send CORS headers. Loading it into an <img> tag works fine
 * for plain display, but capturing it onto a <canvas> (what html-to-image
 * does under the hood) taints the canvas unless the image bytes came from
 * a same-origin source. Fetching the bytes once and handing back an
 * object URL sidesteps this: a blob: URL is always canvas-safe regardless
 * of where the bytes originally came from, since it's just local memory.
 * If the fetch itself is blocked by CORS, this throws, and the caller
 * falls back to a non-composited share/download of the original URL.
 */
export async function loadImageAsObjectUrl(remoteUrl: string): Promise<string> {
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status}).`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function supportsFileShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  );
}

async function shareOrDownloadBlob(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || "image/png" });

  if (supportsFileShare() && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: "Happy Shopping" });
    return "shared";
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
  return "downloaded";
}

/** Composites the given node (result photo + branded footer) into a PNG, then shares or downloads it. */
export async function captureAndShareNode(node: HTMLElement, filename: string): Promise<ShareOutcome> {
  const blob = await toBlob(node, { pixelRatio: 2 });
  if (!blob) {
    throw new Error("Couldn't generate an image from this result.");
  }
  return shareOrDownloadBlob(blob, filename);
}

/** Shares or downloads a remote image directly, without any branded compositing (CORS-safe fallback path). */
export async function shareOrDownloadUrl(remoteUrl: string, filename: string): Promise<ShareOutcome> {
  const blob = await (await fetch(remoteUrl)).blob();
  return shareOrDownloadBlob(blob, filename);
}
