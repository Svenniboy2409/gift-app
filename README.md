# Wenslijst

Een web-app voor cadeauwensen. Je plakt de link van een product, de app haalt
automatisch de naam, de foto en de prijs op, en je past aan wat je wil. Je
cadeaus staan in lijsten die je met één link deelt met familie en vrienden.

**De verrassing blijft intact:** bezoekers zien welke cadeaus al geclaimd zijn,
maar de eigenaar van de lijst ziet dat nooit.

> **Waar staat de app online?**
> Nog nergens — die moet je één keer zelf deployen, zie
> [Online zetten](#online-zetten-op-vercel). Daarna krijg je een adres als
> `https://wenslijst.vercel.app`.
>
> **GitHub Pages werkt hier niet voor.** Pages kan alleen kant-en-klare
> bestanden serveren, terwijl deze app een draaiende server nodig heeft (om
> productlinks uit te lezen, in te loggen en lijsten op te slaan) plus een
> database. `svenniboy2409.github.io/gift-app` zal daarom altijd leeg blijven.

## Wat de app doet

- **Link plakken → alles ingevuld.** Titel, omschrijving, prijs, afbeelding en
  winkelnaam worden uit de productpagina gehaald. Elk veld blijft bewerkbaar, en
  als het uitlezen mislukt kun je het cadeau gewoon handmatig invullen.
- **Lijsten per gelegenheid** met datum, aftellen, omslagkleur en
  zichtbaarheid (privé / iedereen met de link / ook op je profiel).
- **Cadeau-details:** prioriteit (leuk / graag / heel graag), gewenst aantal en
  een notitie voor maat, kleur of variant.
- **Claimen zonder account.** Een bezoeker vult alleen een naam in. Bij meerdere
  exemplaren telt de app af ("nog 1 van 2 beschikbaar"). Je eigen claim kun je
  altijd weer intrekken.
- **Delen** via een onraadbare link (`/l/<code>`) en een profielpagina
  (`/u/<handle>`) met je openbare lijsten.
- **Nederlands en Engels**, lichte en donkere modus.

## Snel starten

Je hebt Node 20+ en een PostgreSQL-database nodig.

```bash
npm install
cp .env.example .env       # vul DATABASE_URL en AUTH_SECRET in
npx prisma migrate dev     # maakt de tabellen aan
npm run dev                # http://localhost:3000
```

Genereer een echte `AUTH_SECRET` met:

```bash
openssl rand -base64 32
```

### Postgres lokaal

Heb je nog geen database, dan is dit de snelste weg:

```bash
docker run --name wenslijst-db -e POSTGRES_PASSWORD=wenslijst \
  -p 5432:5432 -d postgres:16
```

Zet dan in `.env`:

```
DATABASE_URL="postgresql://postgres:wenslijst@127.0.0.1:5432/postgres?schema=public"
```

## Online zetten (op Vercel)

Dit hoef je één keer te doen. Je hebt geen ervaring met de commandoregel nodig;
alles gaat via de website van Vercel. Reken op een kwartier.

### 1. Account en project

1. Ga naar [vercel.com](https://vercel.com) en log in met je GitHub-account.
2. Klik op **Add New… → Project** en kies de repository `gift-app`.
3. Klik nog **niet** op Deploy — eerst de instellingen hieronder.

### 2. Database koppelen

1. Open in het Vercel-dashboard het tabblad **Storage** en klik op
   **Create Database → Neon** (Postgres). Kies een regio in Europa.
2. Koppel de database aan je project. Vercel zet `DATABASE_URL` dan automatisch
   bij je environment variables.

### 3. Afbeeldingen koppelen

1. Nog steeds bij **Storage**: **Create → Blob Store**, en koppel die ook aan je
   project. Vercel zet dan `BLOB_READ_WRITE_TOKEN` klaar.
2. Sla je dit over, dan werkt de app verder prima, maar het opslaan van foto's
   mislukt — het bestandssysteem van Vercel is namelijk alleen-lezen. De app
   zegt dat dan ook met zoveel woorden.

### 4. De inlogsleutel

Zet bij **Settings → Environment Variables** één variabele met de hand:

| Naam | Waarde |
| --- | --- |
| `AUTH_SECRET` | een lange, willekeurige reeks tekens |

Een goede waarde maak je op [randomkeygen.com](https://randomkeygen.com) — pak
er een uit "CodeIgniter Encryption Keys". Of op de commandoregel met
`openssl rand -base64 32`. Deze sleutel ondertekent de inlog-cookies; houd hem
geheim en verander hem later niet zomaar, want dan wordt iedereen uitgelogd.

### 5. Deploy

Klik op **Deploy**. De database-tabellen worden tijdens het bouwen automatisch
aangemaakt (`prisma migrate deploy` zit in het `build`-script).

Als het klaar is geeft Vercel je adres, meestal
`https://gift-app-<iets>.vercel.app`. Dat is het adres van je app. Onder
**Settings → Domains** kun je er een kortere van maken, bijvoorbeeld
`wenslijst.vercel.app`, of je eigen domeinnaam koppelen.

### Kort samengevat

| Variabele | Nodig? | Waar vandaan |
| --- | --- | --- |
| `DATABASE_URL` | ja | wordt gezet door de Neon/Postgres-koppeling |
| `AUTH_SECRET` | ja | zelf invullen, willekeurige tekens |
| `BLOB_READ_WRITE_TOKEN` | voor foto's | wordt gezet door de Blob-koppeling |

### Waarom niet GitHub Pages?

GitHub Pages serveert alleen kant-en-klare bestanden. Deze app moet bij elk
bezoek dingen op de server doen: een productpagina ophalen en uitlezen,
wachtwoorden controleren, lijsten en claims opslaan in een database. Dat kan
Pages niet, ongeacht de instellingen. Vercel, Netlify, Railway, Render of een
eigen server met Docker kunnen het wél.

## Hoe het uitlezen van links werkt

`POST /api/scrape` haalt de pagina op en probeert de productgegevens in deze
volgorde te vinden (per veld wint de eerste treffer):

1. JSON-LD `schema.org/Product` — inclusief `@graph`
2. Microdata / `itemprop`
3. OpenGraph en Twitter cards
4. Shop-specifieke selectors (`lib/scraper/sites.ts`) voor bol.com, Coolblue,
   Amazon, MediaMarkt, Zalando, HEMA, IKEA, Action, Wehkamp, Etsy en Decathlon.
   Bij die shops wint de zichtbare prijs van de pagina, omdat hun OpenGraph-prijs
   nogal eens verouderd is.
5. Als laatste redmiddel de `<h1>` of `<title>` plus de eerste grote afbeelding

De gevonden afbeelding wordt gedownload en als eigen kopie opgeslagen, zodat
foto's blijven werken als de webshop de originele URL wijzigt.

Webshops mogen dit weigeren. Krijgen we een 403 of vinden we niets, dan opent
hetzelfde formulier met een duidelijke melding en vul je het zelf in — toevoegen
mislukt dus nooit helemaal.

### Veiligheid van de scraper

`lib/scraper/safe-fetch.ts` voorkomt dat de app als proxy naar het interne
netwerk gebruikt kan worden (SSRF): alleen http/https, DNS-resolutie wordt
gecontroleerd op privé-, loopback- en link-local-adressen (ook bij elke
redirect), maximaal 3 redirects, 12 seconden time-out, 2 MB HTML en 5 MB per
afbeelding. Daarbovenop geldt een rate limit per gebruiker.

## Hoe de verrassing bewaakt wordt

Dit zit in de datalaag, niet alleen in de UI (`lib/gifts.ts`):

- `getListForOwner()` selecteert **nooit** iets uit de `Claim`-tabel. De eigenaar
  kan claims dus ook niet uit een API-antwoord of de netwerk-tab vissen.
- `getListForVisitor()` geeft de claim-status wél terug — daar is die functie
  voor.

De end-to-end test controleert dit expliciet: na een claim mag de naam van de
koper nergens in de HTML van de eigenaar voorkomen.

## Tests

```bash
npm test          # unit tests (prijzen, extractie, SSRF-blokkade)
npm run typecheck # TypeScript
npm run test:e2e  # Playwright: registreren → lijst → claimen → verrassing
```

Het `build`-script draait ook `prisma migrate deploy`, zodat de tabellen op
Vercel vanzelf goed komen te staan. Wil je bouwen zonder database in de buurt,
gebruik dan `npm run build:no-db`.

De e2e-test bouwt en start de app zelf op poort 3100 en heeft een database
nodig. Gebruikt jouw omgeving een Chromium die niet bij de Playwright-versie
hoort, zet dan `CHROMIUM_PATH` naar het binaire bestand.

Het uitlezen van links wordt in de e2e-test onderschept: de scraper weigert
privé-adressen, dus een lokale testwinkel is niet mogelijk. De extractie zelf is
gedekt door `tests/unit/extract.test.ts` met realistische HTML van elke variant.

## Structuur

```
app/
  (auth)/           inloggen en registreren
  (app)/            dashboard, lijst bewerken, instellingen (ingelogd)
  l/[code]/         de gedeelde lijst voor bezoekers
  u/[handle]/       openbaar profiel
  api/scrape/       productgegevens uit een link halen
  api/upload/       eigen foto uploaden
lib/
  auth.ts           wachtwoorden, sessies (JWT in httpOnly-cookie)
  lists.ts          lijsten van de eigenaar
  gifts.ts          cadeaus — owner- en bezoekersweergave strikt gescheiden
  claims.ts         reserveren, met een anoniem token in een cookie
  scraper/          safe-fetch, extractie, prijsparser, shop-regels
  i18n/             Nederlands en Engels
components/         de interface
messages/           nl.json en en.json
```

## Techniek

Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma met PostgreSQL,
bcrypt + JWT voor inloggen, cheerio voor het uitlezen van pagina's.
