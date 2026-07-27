import { SiteFooter, SiteHeader } from "@/components/site-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-14 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
