import type { MetadataRoute } from "next";

/**
 * Hiermee kun je de app op je beginscherm zetten en start hij als een echte
 * app: zonder adresbalk, met een eigen icoon en de juiste kleur eromheen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wenslijst",
    short_name: "Wenslijst",
    description: "Verlanglijstjes die zichzelf invullen.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdfaf6",
    theme_color: "#fdfaf6",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
