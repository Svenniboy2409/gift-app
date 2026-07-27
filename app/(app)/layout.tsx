import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/config";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nog niet ingesteld? Dan naar de startpagina, die legt uit wat er mist.
  if (!isConfigured()) redirect("/");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
