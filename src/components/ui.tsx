import type { Want, WantStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { ZoomImage } from "./ZoomImage";

const STATUS_STYLE: Record<WantStatus, string> = {
  open: "bg-open-soft text-open",
  pending: "bg-pending-soft text-pending",
  sold: "bg-surface-2 text-ink-muted",
  no_deal: "bg-surface-2 text-ink-muted",
};

export function StatusBadge({ status }: { status: WantStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ScopeBadge({ want }: { want: Want }) {
  return (
    <span className="inline-flex rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted">
      {want.scope === "local"
        ? `Local preferred · ${want.city}, ${want.state}`
        : "Nationwide"}
    </span>
  );
}

/** Official card image when linked to TCGdex, else a card-shaped placeholder. */
export function CardArt({
  want,
  size = "high",
  className = "",
}: {
  want: Want;
  size?: "low" | "high";
  className?: string;
}) {
  if (want.officialImage) {
    return (
      <ZoomImage
        src={`${want.officialImage}/${size}.webp`}
        zoomSrc={`${want.officialImage}/high.webp`}
        alt={want.cardName}
        loading="lazy"
        className={`aspect-[5/7] w-full rounded-lg object-cover shadow-sm ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex aspect-[5/7] w-full flex-col justify-between rounded-lg border border-line bg-gradient-to-br from-brand-soft to-surface-2 p-3 ${className}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
        {want.setName}
      </span>
      <span className="text-sm font-semibold leading-tight text-ink">{want.cardName}</span>
      <span className="text-[10px] text-ink-muted">No image</span>
    </div>
  );
}
