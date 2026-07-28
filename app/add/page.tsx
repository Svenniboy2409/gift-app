import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/config";
import { getListsForOwner } from "@/lib/lists";
import { getTranslator } from "@/lib/i18n/server";
import { looksLikeJunkImage } from "@/lib/scraper/junk";
import { AddFromBookmarklet } from "@/components/add-from-bookmarklet";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-header";

export const metadata = { robots: { index: false, follow: false } };

type Params = Promise<{
  url?: string;
  title?: string;
  image?: string;
  price?: string;
  currency?: string;
  description?: string;
}>;

/** Alleen doorlaten wat een echte http(s)-link is. */
function safeUrl(value: string | undefined) {
  if (!value || !/^https?:\/\//i.test(value)) return "";
  return value.slice(0, 2000);
}

/**
 * Waar de bewaarknop op uitkomt. De bookmarklet leest de productpagina uit in
 * je eigen browser — en die wordt door geen enkele webshop geweerd, want jij
 * bent een gewone bezoeker — en stuurt de gegevens hierheen als querystring.
 */
export default async function AddPage({ searchParams }: { searchParams: Params }) {
  if (!isConfigured()) redirect("/");

  const params = await searchParams;
  const target = `/add?${new URLSearchParams(
    Object.entries(params).filter(([, v]) => typeof v === "string") as [
      string,
      string,
    ][],
  ).toString()}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);

  const [lists, { t }] = await Promise.all([
    getListsForOwner(user.id),
    getTranslator(),
  ]);

  const image = safeUrl(params.image);

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center gap-2 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold tracking-tight text-ink"
          >
            <Logo />
            {t("app.name")}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {lists.length === 0 ? (
          <div className="card px-6 py-14 text-center">
            <h1 className="font-semibold text-ink">{t("dashboard.empty.title")}</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              {t("bookmarklet.needList")}
            </p>
            <Link href="/lists/new" className="btn btn-primary mt-6">
              {t("dashboard.newList")}
            </Link>
          </div>
        ) : (
          <AddFromBookmarklet
            lists={lists.map((list) => ({ id: list.id, title: list.title }))}
            draft={{
              title: (params.title ?? "").slice(0, 160),
              description: (params.description ?? "").slice(0, 600),
              price: (params.price ?? "").slice(0, 20),
              currency: (params.currency ?? "EUR").slice(0, 3).toUpperCase(),
              url: safeUrl(params.url),
              imageUrl: looksLikeJunkImage(image) ? "" : image,
            }}
          />
        )}
      </main>

      <SiteFooter />
    </>
  );
}
