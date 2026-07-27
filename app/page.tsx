import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { missingConfig } from "@/lib/config";
import { getTranslator } from "@/lib/i18n/server";
import { SetupNotice } from "@/components/setup-notice";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default async function HomePage() {
  // Vlak na een eerste deploy is er nog geen database of inlogsleutel. Toon
  // dan uitleg in plaats van te klappen op de eerste query.
  const missing = missingConfig();
  if (missing.length > 0) return <SetupNotice missing={missing} />;

  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { t } = await getTranslator();

  const steps = [
    { key: "step1", number: "1" },
    { key: "step2", number: "2" },
    { key: "step3", number: "3" },
  ] as const;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">
        <section className="py-16 text-center sm:py-24">
          <p className="chip mx-auto mb-6 bg-accent-soft text-accent">
            {t("app.tagline")}
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            {t("landing.subtitle")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn btn-primary px-6 py-3 text-base">
              {t("landing.cta")}
            </Link>
            <Link href="/login" className="btn btn-secondary px-6 py-3 text-base">
              {t("landing.ctaSecondary")}
            </Link>
          </div>
        </section>

        {/* Voorbeeldkaart: laat meteen zien hoe het toevoegen eruitziet. */}
        <section className="pb-16">
          <div className="card mx-auto max-w-2xl overflow-hidden p-1.5 shadow-soft-lg">
            <div className="rounded-xl bg-sunken p-4 sm:p-6">
              <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-raised px-4 py-3 text-sm text-subtle">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"
                  />
                </svg>
                <span className="truncate">https://www.bol.com/nl/p/…</span>
              </div>

              <div className="mt-4 flex gap-4 rounded-xl bg-raised p-4 shadow-sm">
                <div className="cover-terracotta size-20 shrink-0 rounded-lg sm:size-24" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="flex items-center gap-2 pt-1">
                    <span className="chip bg-accent-soft text-accent">€ 49,95</span>
                    <span className="chip">bol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 pb-16 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.key} className="card card-hover p-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {step.number}
              </span>
              <h2 className="mt-4 font-semibold text-ink">
                {t(`landing.${step.key}.title` as "landing.step1.title")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t(`landing.${step.key}.body` as "landing.step1.body")}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-20 rounded-2xl bg-sunken p-8 text-center sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            {t("landing.surprise.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">
            {t("landing.surprise.body")}
          </p>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
