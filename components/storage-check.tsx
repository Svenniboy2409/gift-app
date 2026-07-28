"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { uploadErrorKey } from "@/lib/upload-errors";

type Result =
  | { ok: true; mode: "blob" | "filesystem" }
  | { ok: false; error?: string; detail?: string };

/**
 * Controleert of het opslaan van foto's werkt, zonder dat je er een echte foto
 * voor hoeft te kiezen. Zet een testbestandje neer, ruimt het weer op, en laat
 * bij een fout letterlijk zien wat de opslagdienst terugstuurde — dat is bij
 * een gehoste app het enige dat je zonder logboek in handen hebt.
 */
export function StorageCheck() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/storage-check", { method: "POST" });
      const data = (await response.json().catch(() => null)) as Result | null;
      setResult(data ?? { ok: false });
    } catch {
      setResult({ ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="font-semibold text-ink">{t("settings.storage")}</h2>
      <p className="mt-1 text-sm text-muted">{t("settings.storageBody")}</p>

      <button
        type="button"
        className="btn btn-secondary mt-4"
        onClick={run}
        disabled={busy}
      >
        {busy ? t("settings.storageTesting") : t("settings.storageTest")}
      </button>

      {result?.ok && (
        <p className="mt-3 text-sm text-success">
          {result.mode === "blob"
            ? t("settings.storageOkBlob")
            : t("settings.storageOkLocal")}
        </p>
      )}

      {result && !result.ok && (
        <div className="mt-3">
          <p className="text-sm text-danger">{t(uploadErrorKey(result.error))}</p>
          {result.detail && (
            <p className="mt-1 break-words text-xs text-subtle">{result.detail}</p>
          )}
        </div>
      )}
    </section>
  );
}
