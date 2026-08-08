"use client";

import { useState } from "react";
import Image from "next/image";
import type { Order } from "../../../lib/orders";
import type { ProofRecord, ReturnCase, ReturnCaseStatus } from "../../../lib/returnsService";

const STATUS_LABELS: Record<ReturnCaseStatus, string> = {
  proof_pending: "Proof Pending",
  proof_complete: "Proof Complete",
  dispute_open: "Dispute Open",
  resolved: "Resolved",
};

const STATUS_STYLES: Record<ReturnCaseStatus, string> = {
  proof_pending: "bg-amber-100 text-amber-700",
  proof_complete: "bg-sky-100 text-sky-700",
  dispute_open: "bg-red-100 text-red-600",
  resolved: "bg-emerald-100 text-emerald-700",
};

const STATUS_TRANSITIONS: ReturnCaseStatus[] = ["proof_complete", "dispute_open", "resolved"];

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".avi"];

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
}

function ProofThumbnail({ label, record }: { label: string; record?: ProofRecord }) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      {!record ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-xs text-slate-400">
          Not uploaded
        </div>
      ) : isVideoUrl(record.mediaUrl) ? (
        <video src={record.mediaUrl} controls className="h-32 w-full rounded-2xl object-cover" />
      ) : (
        <a href={record.mediaUrl} target="_blank" rel="noreferrer" className="block">
          <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-slate-100">
            <Image src={record.mediaUrl} alt={`${label} proof`} fill sizes="200px" className="object-cover" unoptimized />
          </div>
        </a>
      )}
    </div>
  );
}

function ReturnCaseCard({
  returnCase,
  order,
  onStatusChange,
  isUpdating,
}: {
  returnCase: ReturnCase;
  order?: Order;
  onStatusChange: (status: ReturnCaseStatus) => void;
  isUpdating: boolean;
}) {
  const packing = returnCase.proofRecords.find((p) => p.type === "packing");
  const unboxing = returnCase.proofRecords.find((p) => p.type === "unboxing");
  const item = order?.items.find((i) => i.id === returnCase.itemId);
  // Locale pinned to "en-US" (not the visitor's own locale via `undefined`)
  // -- this renders both during SSR (Node's default locale) and again on
  // the client during hydration (the browser's locale); if those two ever
  // disagree, React throws a hydration mismatch. Caught via the Next.js
  // dev overlay on this exact page.
  const placedOn = returnCase.createdAt
    ? new Date(returnCase.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Case #{returnCase.id} · Order #{returnCase.orderId}
          </p>
          <p className="mt-0.5 font-semibold text-slate-800">
            {item ? item.name : `Item #${returnCase.itemId}`}
          </p>
          <p className="text-sm text-slate-500">
            {order?.shippingAddress.name ?? "Unknown customer"}
            {placedOn ? ` · Ordered ${placedOn}` : ""}
          </p>
        </div>
        <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[returnCase.status]}`}>
          {STATUS_LABELS[returnCase.status]}
        </span>
      </div>

      <div className="flex gap-4">
        <ProofThumbnail label="Packing Proof" record={packing} />
        <ProofThumbnail label="Unboxing Proof" record={unboxing} />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {STATUS_TRANSITIONS.filter((status) => status !== returnCase.status).map((status) => (
          <button
            key={status}
            type="button"
            disabled={isUpdating}
            onClick={() => onStatusChange(status)}
            className="rounded-full border-2 border-pink-200 px-4 py-1.5 text-xs font-semibold text-pink-500 transition-colors hover:bg-pink-50 disabled:opacity-60"
          >
            Mark {STATUS_LABELS[status]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReturnsPanel({
  initialCases,
  ordersById,
}: {
  initialCases: ReturnCase[];
  ordersById: Record<number, Order>;
}) {
  const [cases, setCases] = useState<ReturnCase[]>(initialCases);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStatusChange(returnCase: ReturnCase, status: ReturnCaseStatus) {
    setUpdatingId(returnCase.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/return-cases/${returnCase.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update this return case.");
      }
      setCases((current) => current.map((c) => (c.id === returnCase.id ? { ...c, status: data.status } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this return case.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (cases.length === 0) {
    return <p className="text-slate-600">No return cases yet.</p>;
  }

  return (
    <div>
      <p className="mb-6 text-slate-600">{cases.length} return cases</p>
      {error && <p className="mb-4 text-sm font-medium text-red-500">{error}</p>}
      <div className="flex flex-col gap-4">
        {cases.map((returnCase) => (
          <ReturnCaseCard
            key={returnCase.id}
            returnCase={returnCase}
            order={ordersById[returnCase.orderId]}
            isUpdating={updatingId === returnCase.id}
            onStatusChange={(status) => handleStatusChange(returnCase, status)}
          />
        ))}
      </div>
    </div>
  );
}
