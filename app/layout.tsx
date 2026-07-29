import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { ThemeScript } from "@/components/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wenslijst — verlanglijstjes die zichzelf invullen",
  description:
    "Plak een productlink en Wenslijst haalt automatisch de naam, foto en prijs op. Deel je lijst met één link.",
  appleWebApp: {
    capable: true,
    title: "Wenslijst",
    // Doorzichtig, zodat de balk van de telefoon de kleur van de app overneemt.
    statusBarStyle: "black-translucent",
  },
};

/**
 * `viewportFit: "cover"` laat de app tot in de hoeken lopen op een telefoon met
 * afgeronde randen; de veilige marges vangen we zelf op met env(safe-area-*).
 * De themakleur zorgt dat de balk bovenaan meekleurt met licht of donker.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#191512" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
