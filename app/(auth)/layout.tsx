import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/config";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inloggen kan niet zonder database en inlogsleutel; de startpagina legt uit
  // wat er nog mist.
  if (!isConfigured()) redirect("/");

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-14">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
