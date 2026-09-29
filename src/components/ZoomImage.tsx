"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HOVER_DELAY_MS = 300;
const LENS_SIZE = 180;
const ZOOM = 2.5;
/** Small thumbnails zoom harder so the lens still shows real detail. */
const MIN_ZOOMED_WIDTH = 480;

type Lens = { x: number; y: number; rect: DOMRect };

/**
 * An <img> that shows a round magnifying lens under the mouse after a short hover.
 * Touch and pen input are ignored. `zoomSrc` (e.g. a high-res version) is used inside the lens.
 */
export function ZoomImage({
  src,
  zoomSrc = src,
  alt,
  className = "",
  loading,
}: {
  src: string;
  zoomSrc?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const point = useRef({ x: 0, y: 0 });
  const [lens, setLens] = useState<Lens>();

  const hide = () => {
    clearTimeout(timer.current);
    setLens(undefined);
  };

  // Scrolling moves the image out from under a fixed-position lens, so just close it.
  useEffect(() => {
    if (!lens) return;
    const close = () => setLens(undefined);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [lens]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const place = (x: number, y: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (rect) setLens({ x, y, rect });
  };

  let lensEl = null;
  if (lens) {
    const { rect } = lens;
    const bgW = Math.max(rect.width * ZOOM, MIN_ZOOMED_WIDTH);
    const bgH = (bgW * rect.height) / rect.width;
    const fx = (lens.x - rect.left) / rect.width;
    const fy = (lens.y - rect.top) / rect.height;
    lensEl = createPortal(
      <div
        aria-hidden
        className="pointer-events-none fixed z-50 rounded-full border-2 border-surface bg-surface-2 bg-no-repeat shadow-xl ring-1 ring-line"
        style={{
          width: LENS_SIZE,
          height: LENS_SIZE,
          left: lens.x - LENS_SIZE / 2,
          top: lens.y - LENS_SIZE / 2,
          backgroundImage: `url("${zoomSrc}")`,
          backgroundSize: `${bgW}px ${bgH}px`,
          backgroundPosition: `${LENS_SIZE / 2 - fx * bgW}px ${LENS_SIZE / 2 - fy * bgH}px`,
        }}
      />,
      document.body,
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- external TCGdex CDN */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        className={className}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          point.current = { x: e.clientX, y: e.clientY };
          new Image().src = zoomSrc; // start loading now so the lens isn't blank when it opens
          clearTimeout(timer.current);
          timer.current = setTimeout(() => place(point.current.x, point.current.y), HOVER_DELAY_MS);
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          point.current = { x: e.clientX, y: e.clientY };
          if (lens) place(e.clientX, e.clientY);
        }}
        onPointerLeave={hide}
      />
      {lensEl}
    </>
  );
}
