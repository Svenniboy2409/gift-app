import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
