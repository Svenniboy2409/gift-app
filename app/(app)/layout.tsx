import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured } from "@/lib/config";
import { getListsForOwner } from "@/lib/lists";
import { BottomNav } from "@/components/bottom-nav";
import { SheetsProvider } from "@/components/sheets";
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

  // De schuifpanelen zitten in de layout, zodat je vanaf elke pagina een cadeau
  // of een lijst kunt toevoegen. Daarvoor moeten de lijsten hier al bekend zijn.
  const lists = await getListsForOwner(user.id);

  return (
    <SheetsProvider
      lists={lists.map((list) => ({ id: list.id, title: list.title }))}
    >
      <SiteHeader />
      {/* De ruimte onderaan houdt de laatste knop vrij van de navigatiebalk,
          inclusief de streep van de iPhone. Vanaf md verdwijnt de balk en is
          die ruimte niet meer nodig. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-12 md:pb-12">
        {children}
      </main>
      {/* De voettekst hoort bij het bureaublad; op de telefoon staat daar de
          navigatiebalk, net als in een app. */}
      <div className="hidden md:block">
        <SiteFooter />
      </div>
      <BottomNav />
    </SheetsProvider>
  );
}
