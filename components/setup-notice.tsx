import type { RequiredEnv } from "@/lib/config";
import { Logo } from "@/components/logo";

const EXPLANATION: Record<RequiredEnv, { wat: string; hoe: string }> = {
  DATABASE_URL: {
    wat: "De database waarin je lijsten en cadeaus bewaard worden.",
    hoe: "Koppel bij Vercel onder Storage een Postgres-database (Neon) aan dit project, of maak er zelf een op neon.tech en plak de connection string hier.",
  },
  AUTH_SECRET: {
    wat: "De sleutel waarmee inlog-cookies ondertekend worden.",
    hoe: "Vul zelf een lange, willekeurige reeks tekens in. Bijvoorbeeld via randomkeygen.com, of met `openssl rand -base64 32`.",
  },
};

/**
 * Wordt getoond zolang de app nog niet volledig is ingesteld — meestal direct
 * na de allereerste deploy. Toont uitsluitend de namen van de ontbrekende
 * variabelen, nooit waarden: deze pagina is publiek bereikbaar.
 */
export function SetupNotice({ missing }: { missing: RequiredEnv[] }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="card w-full max-w-xl p-7 shadow-soft sm:p-9">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-lg font-semibold tracking-tight text-ink">
            Wenslijst
          </span>
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">
          Bijna klaar
        </h1>
        <p className="mt-2 leading-relaxed text-muted">
          De app draait, maar{" "}
          {missing.length === 1
            ? "er ontbreekt nog één instelling"
            : `er ontbreken nog ${missing.length} instellingen`}
          . Vul {missing.length === 1 ? "hem" : "ze"} bij je hosting in onder de
          environment variables en deploy daarna opnieuw.
        </p>

        <ul className="mt-6 space-y-4">
          {missing.map((name) => (
            <li key={name} className="rounded-xl bg-sunken p-4">
              <code className="font-mono text-sm font-semibold text-accent">
                {name}
              </code>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">
                {EXPLANATION[name].wat}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {EXPLANATION[name].hoe}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-7 border-t border-line pt-5 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">Op Vercel</p>
          <p className="mt-1">
            Settings → Environment Variables om ze in te vullen, daarna
            Deployments → de bovenste → Redeploy. Op een telefoon is die
            tabbladenrij zijwaarts te scrollen.
          </p>
          <p className="mt-3">
            De volledige uitleg staat in het bestand <code>README.md</code> van
            dit project.
          </p>
        </div>
      </div>
    </main>
  );
}
