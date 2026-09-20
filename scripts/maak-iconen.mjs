/**
 * Maakt de iconen voor het beginscherm uit hetzelfde logo als in de app.
 *
 *   node scripts/maak-iconen.mjs
 *
 * Draai dit opnieuw als `components/logo.tsx` verandert, anders staat er op
 * iemands beginscherm nog het oude cadeau. De uitkomst gaat mee in git; dit
 * script hoort niet bij de build.
 *
 * Het leest de SVG rechtstreeks uit de component en maakt er gewone HTML van,
 * zodat er maar één tekening bestaat. De achtergrond is de lichte kleur van de
 * app en het cadeau vult 62% van het vlak: telefoons knippen bij een
 * "maskable" icoon de buitenste rand eraf.
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const MATEN = [
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
];

const bron = readFileSync("components/logo.tsx", "utf8");
const svg = bron
  .slice(bron.indexOf("<svg"), bron.lastIndexOf("</svg>") + 6)
  .replace(/className=\{className\}/, 'class="logo"')
  .replace(/stopColor=/g, "stop-color=")
  .replace(/stopOpacity=/g, "stop-opacity=")
  .replace(/strokeWidth=/g, "stroke-width=")
  .replace(/strokeLinecap=/g, "stroke-linecap=")
  .replace(/aria-hidden="true"/, "")
  .replace(/role="presentation"/, "")
  // De stijl staat in de component als een JS-object; hier moet het CSS zijn.
  .replace(/\{\s*\{([\s\S]*?)\}\s*as React\.CSSProperties\s*\}/, (_m, body) => {
    const paren = [...body.matchAll(/"([^"]+)":\s*"([^"]+)"/g)]
      .map(([, sleutel, waarde]) => `${sleutel}:${waarde}`)
      .join(";");
    return `"${paren}"`;
  })
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();

for (const [naam, maat] of MATEN) {
  await page.setViewportSize({ width: maat, height: maat });
  await page.setContent(`<!doctype html><html><head><style>
      html, body { margin: 0; padding: 0 }
      /* Terracotta: de kleur van de app zelf. Een icoon op het beginscherm
         hoort bij geen enkele lijst in het bijzonder. */
      :root {
        --accent: #c4633c;
      }
      #doek {
        width: ${maat}px; height: ${maat}px;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(120% 120% at 30% 15%, #fffdfa, #f6ece0);
      }
      .logo { width: 62%; height: 62% }
    </style></head><body><div id="doek">${svg}</div></body></html>`);
  await page.locator("#doek").screenshot({ path: `public/${naam}.png` });
  console.log(`public/${naam}.png (${maat}×${maat})`);
}

await browser.close();
