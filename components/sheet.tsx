"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/**
 * Een paneel dat van onderen omhoog schuift, zoals in een telefoon-app.
 *
 * Je sluit hem door de bovenrand naar beneden te slepen, door naast het paneel
 * te tikken of met Escape. In alle drie de gevallen schuift hij met dezelfde
 * beweging weer omlaag; bij slepen gaat hij verder vanaf de plek waar je hem
 * losliet, zodat het één doorlopende beweging blijft.
 *
 * Op een breed scherm zou zo'n paneel over de volle breedte raar staan, dus
 * daar houden we hem in het midden en beperken we de breedte.
 */

type Phase = "closed" | "open" | "closing";

/** Zoveel pixels naar beneden en hij gaat dicht; korter veert hij terug. */
const DISMISS_AFTER = 90;

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; offset: number } | null>(null);

  // De sluitanimatie moet nog kunnen aflopen nadat de bovenliggende component
  // het paneel al gesloten heeft. Daarom houden we hier een eigen fase bij, die
  // we tijdens het renderen bijstellen — dat scheelt een effect dat achter de
  // feiten aan loopt.
  const [prevOpen, setPrevOpen] = useState(open);
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPhase("open");
    else if (phase === "open") setPhase("closing");
  }

  /** Begin de sluitbeweging; onClose volgt zodra die klaar is. */
  const requestClose = useCallback(() => {
    setPhase((current) => (current === "open" ? "closing" : current));
  }, []);

  useEffect(() => {
    if (phase === "closed") return;

    // De pagina eronder mag niet meescrollen zolang het paneel openstaat.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, requestClose]);

  if (phase === "closed") return null;

  const closing = phase === "closing";

  /** Aan het eind van de sluitanimatie pas echt weg. */
  function finish(event: React.AnimationEvent<HTMLDivElement>) {
    // Formulieren binnenin hebben hun eigen animatie; die bubbelt hierheen.
    if (event.target !== event.currentTarget || !closing) return;
    setPhase("closed");
    if (open) onClose();
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (closing) return;
    drag.current = { startY: event.clientY, offset: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const node = panel.current;
    if (!state || !node) return;

    // Alleen naar beneden: omhoog trekken doet niets.
    const offset = Math.max(0, event.clientY - state.startY);
    state.offset = offset;
    node.style.transform = `translateY(${offset}px)`;
  }

  function endDrag() {
    const state = drag.current;
    const node = panel.current;
    drag.current = null;
    if (!state || !node) return;

    if (state.offset > DISMISS_AFTER) {
      // Verder omlaag vanaf waar je hem losliet, in plaats van eerst
      // terugspringen naar boven.
      node.style.setProperty("--sheet-from", `${state.offset}px`);
      node.style.transition = "";
      node.style.transform = "";
      requestClose();
      return;
    }

    node.style.transition = "transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)";
    node.style.transform = "translateY(0px)";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={requestClose}
        className={`absolute inset-0 bg-black/45 ${
          closing ? "sheet-backdrop-out" : "sheet-backdrop"
        }`}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onAnimationEnd={finish}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-raised shadow-soft-lg sm:max-w-lg sm:rounded-3xl ${
          closing ? "sheet-out" : "sheet"
        }`}
      >
        {/* De hele bovenrand is de greep: hier sleep je het paneel weg. */}
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        >
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
          <h2 className="px-5 pb-3 pt-3 text-lg font-semibold tracking-tight text-ink">
            {title}
          </h2>
        </div>

        {/* Alleen de inhoud scrollt, zodat de titel blijft staan. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
}
