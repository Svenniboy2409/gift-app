import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";
import { Logo } from "@/components/logo";

export default async function NotFound() {
  const { t } = await getTranslator();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="card max-w-md p-8 text-center">
        <Logo className="mx-auto size-10" />
        <h1 className="mt-4 text-xl font-semibold text-ink">
          {t("visitor.notFound.title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("visitor.notFound.body")}
        </p>
        <Link href="/" className="btn btn-primary mt-6">
          {t("app.name")}
        </Link>
      </div>
    </main>
  );
}
