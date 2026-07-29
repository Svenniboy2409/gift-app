"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Een foto bijsnijden voordat hij wordt opgeslagen.
 *
 * Het kader ligt over de foto: slepen verplaatst het, aan een hoek trekken
 * maakt het groter of kleiner. Voor een profielfoto staat de verhouding vast op
 * 1:1 — dat moet, want hij komt in een rondje te staan. Bij een productfoto
 * maakt de verhouding niet uit, dus daar is het kader helemaal vrij.
 *
 * De maten worden bewaard als breukdeel van de getoonde foto (0–1), niet in
 * pixels. Zo blijft het kader kloppen als het scherm draait, en kunnen we bij
 * het uitsnijden gewoon vermenigvuldigen met de echte afmetingen.
 */

type Rect = { x: number; y: number; w: number; h: number };
type Corner = "nw" | "ne" | "sw" | "se";
type Drag =
  | { kind: "move"; startX: number; startY: number; rect: Rect }
  | { kind: "resize"; corner: Corner; rect: Rect };

/** Zo klein mag het kader hoogstens worden. */
const MIN = 0.08;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ImageCropper({
  file,
  /** Vaste verhouding (breedte ÷ hoogte), of null voor een vrij kader. */
  ratio = null,
  onCancel,
  onDone,
}: {
  file: File;
  ratio?: number | null;
  onCancel: () => void;
  onDone: (file: File) => void;
}) {
  const { t } = useI18n();
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<Drag | null>(null);

  const [url] = useState(() => URL.createObjectURL(file));
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);

  /** De getoonde foto in beeldpunten; nodig om verhoudingen te bewaken. */
  function box() {
    return image.current?.getBoundingClientRect() ?? null;
  }

  /** Een kader dat netjes in het midden past bij de gekozen verhouding. */
  function centered(target: number | null): Rect {
    const area = box();
    if (!area) return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    if (!target) return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };

    // In beeldpunten rekenen, want de foto is zelden vierkant.
    const side = Math.min(area.width / target, area.height) * 0.86;
    const w = (side * target) / area.width;
    const h = side / area.height;
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
  }

  function startMove(event: React.PointerEvent) {
    if (!rect) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind: "move",
      startX: event.clientX,
      startY: event.clientY,
      rect,
    };
  }

  function startResize(event: React.PointerEvent, corner: Corner) {
    if (!rect) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { kind: "resize", corner, rect };
  }

  function move(event: React.PointerEvent) {
    const state = drag.current;
    const area = box();
    if (!state || !area) return;

    if (state.kind === "move") {
      const dx = (event.clientX - state.startX) / area.width;
      const dy = (event.clientY - state.startY) / area.height;
      setRect({
        ...state.rect,
        x: clamp(state.rect.x + dx, 0, 1 - state.rect.w),
        y: clamp(state.rect.y + dy, 0, 1 - state.rect.h),
      });
      return;
    }

    // Slepen aan een hoek: de tegenoverliggende hoek blijft staan.
    const px = clamp((event.clientX - area.left) / area.width, 0, 1);
    const py = clamp((event.clientY - area.top) / area.height, 0, 1);
    const { corner, rect: from } = state;
    const anchorX = corner === "nw" || corner === "sw" ? from.x + from.w : from.x;
    const anchorY = corner === "nw" || corner === "ne" ? from.y + from.h : from.y;

    let w = Math.abs(px - anchorX);
    let h = Math.abs(py - anchorY);

    if (ratio) {
      // Verhouding vasthouden gebeurt in beeldpunten, niet in breukdelen.
      const wPx = w * area.width;
      const hPx = h * area.height;
      const side = Math.max(wPx, hPx * ratio);
      w = side / area.width;
      h = side / ratio / area.height;
    }

    w = Math.max(MIN, w);
    h = Math.max(MIN, h);

    // Binnen de foto blijven, met de verhouding intact.
    const left = px < anchorX ? anchorX - w : anchorX;
    const top = py < anchorY ? anchorY - h : anchorY;
    if (left < 0 || top < 0 || left + w > 1 || top + h > 1) return;

    setRect({ x: left, y: top, w, h });
  }

  function stop() {
    drag.current = null;
  }

  /** Snijdt de foto uit op ware grootte en geeft hem terug als JPEG. */
  async function apply() {
    const node = image.current;
    if (!node || !rect) return;
    setBusy(true);

    try {
      const sx = Math.round(rect.x * node.naturalWidth);
      const sy = Math.round(rect.y * node.naturalHeight);
      const sw = Math.max(1, Math.round(rect.w * node.naturalWidth));
      const sh = Math.max(1, Math.round(rect.h * node.naturalHeight));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const context = canvas.getContext("2d");
      if (!context) {
        onDone(file);
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, sw, sh);
      context.drawImage(node, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9),
      );
      if (!blob) {
        onDone(file);
        return;
      }

      onDone(
        new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "foto"}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } finally {
      setBusy(false);
      URL.revokeObjectURL(url);
    }
  }

  const handle =
    "absolute size-7 rounded-full border-2 border-white bg-accent shadow-soft";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="animate-in flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-raised">
        <h2 className="px-5 pb-2 pt-4 text-lg font-semibold tracking-tight text-ink">
          {t("crop.title")}
        </h2>
        <p className="px-5 pb-3 text-sm text-muted">{t("crop.hint")}</p>

        <div className="flex-1 overflow-y-auto px-5">
          <div
            className="relative mx-auto w-fit touch-none select-none"
            onPointerMove={move}
            onPointerUp={stop}
            onPointerCancel={stop}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- een blob-URL uit de fotokiezer, geen bestand op de server */}
            <img
              ref={image}
              src={url}
              alt=""
              draggable={false}
              onLoad={() => setRect(centered(ratio))}
              onError={() => onDone(file)}
              className="max-h-[52dvh] w-auto max-w-full rounded-lg"
            />

            {rect && (
              <>
                {/* Alles buiten het kader dimmen. */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg bg-black/55"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${rect.x * 100}% 100%, ${
                      rect.x * 100
                    }% ${rect.y * 100}%, ${(rect.x + rect.w) * 100}% ${
                      rect.y * 100
                    }%, ${(rect.x + rect.w) * 100}% ${
                      (rect.y + rect.h) * 100
                    }%, ${rect.x * 100}% ${(rect.y + rect.h) * 100}%, ${
                      rect.x * 100
                    }% 100%, 100% 100%, 100% 0%)`,
                  }}
                />

                <div
                  onPointerDown={startMove}
                  className="absolute cursor-move border-2 border-white/90"
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.w * 100}%`,
                    height: `${rect.h * 100}%`,
                  }}
                >
                  <span
                    onPointerDown={(event) => startResize(event, "nw")}
                    className={`${handle} -left-3.5 -top-3.5 cursor-nwse-resize`}
                  />
                  <span
                    onPointerDown={(event) => startResize(event, "ne")}
                    className={`${handle} -right-3.5 -top-3.5 cursor-nesw-resize`}
                  />
                  <span
                    onPointerDown={(event) => startResize(event, "sw")}
                    className={`${handle} -bottom-3.5 -left-3.5 cursor-nesw-resize`}
                  />
                  <span
                    onPointerDown={(event) => startResize(event, "se")}
                    className={`${handle} -bottom-3.5 -right-3.5 cursor-nwse-resize`}
                  />
                </div>
              </>
            )}
          </div>

        </div>

        <div className="flex flex-col-reverse gap-2 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t("gift.cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={apply}
            disabled={busy || !rect}
          >
            {t("crop.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
