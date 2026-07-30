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
  zichtbaarheid (privé / alleen vrienden / iedereen met de link / ook op je
  profiel).
- **Cadeau-details:** prioriteit (leuk / graag / heel graag), gewenst aantal en
  een notitie voor maat, kleur of variant.
- **Claimen zonder account.** Een bezoeker vult alleen een naam in. Bij meerdere
  exemplaren telt de app af ("nog 1 van 2 beschikbaar"). Je eigen claim kun je
  altijd weer intrekken.
- **Delen** via een onraadbare link (`/l/<code>`) en een profielpagina
  (`/u/<handle>`) met je profielfoto, een korte bio en je openbare lijsten.
- **Vrienden** (`/friends`): iemand opzoeken op profielnaam of een
  uitnodigingslink delen (`/i/<code>`). Vrienden staan bij elkaar met een link
  naar hun profiel.
- **Samen aan één lijst.** Nodig vrienden uit om mee te doen — via het tandwiel
  van de lijst of met een link (`/j/<code>`). Iedereen kan dan cadeaus
  toevoegen en aanpassen; de instellingen blijven van de eigenaar en gelden
  voor alle deelnemers. Met hoogstens tien mensen tegelijk. Wie de lijst liever
  niet op zijn eigen profiel heeft, haalt hem daar met één knop vanaf — bij de
  anderen blijft hij gewoon staan.
- **Een lijst alleen voor vrienden.** Naast privé, met-de-link en openbaar is er
  nu ook *alleen mijn vrienden*: die lijst opent alleen voor wie je als vriend
  hebt — de deel-link is dan niet genoeg — en staat bij hen ook op je profiel.
- **Je account** (`/account`) laat je eigen profiel zien zoals anderen het
  krijgen, met daaronder weggeklapt de lijsten die je juist niet deelt. De
  instellingen zitten achter het tandwiel linksboven.
- **Foto's bijsnijden** voor je ze opslaat. Een profielfoto ligt vast op 1:1,
  want hij komt in een rondje te staan; bij een productfoto is het kader vrij.
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

Op Vercel kun je pas een database koppelen nádat het project bestaat. De app is
daarop ingericht: de eerste deploy slaagt ook zonder database, en op je verse
adres staat dan een pagina die vertelt wat er nog moet gebeuren.

### 1. Project importeren

1. Ga naar [vercel.com](https://vercel.com) en log in met je GitHub-account.
2. Klik op **Add New… → Project** en kies de repository `gift-app`.
3. Laat *Application Preset* op **Next.js** staan en *Root Directory* op `./`.

### 2. De inlogsleutel invullen

Klap op datzelfde scherm, net boven de Deploy-knop, **Environment Variables**
open en voeg er één toe:

| Name | Value |
| --- | --- |
| `AUTH_SECRET` | een lange, willekeurige reeks tekens |

Een goede waarde maak je op [randomkeygen.com](https://randomkeygen.com) — pak
er een uit "CodeIgniter Encryption Keys". Of op de commandoregel met
`openssl rand -base64 32`. Deze sleutel ondertekent de inlog-cookies; houd hem
geheim en verander hem later niet zomaar, want dan wordt iedereen uitgelogd.

### 3. Deploy klikken

Klik op **Deploy**. Na een paar minuten heb je een adres. Open het: je ziet een
pagina die zegt dat de database nog ontbreekt. Dat klopt — die koppelen we nu.

### 4. Database koppelen

Ga naar de opslagpagina van je project. Op je telefoon is de tabbladenrij
zijwaarts te scrollen, dus makkelijker is het om het adres direct in te typen:

```
https://vercel.com/<jouw-team>/gift-app/stores
```

Klik daar op **Create Database → Neon** (Postgres), kies een regio in Europa en
koppel hem aan `gift-app`. Laat *Custom Environment Variable Prefix* leeg en de
vinkjes bij *Create Database Branch For Deployment* uit.

Neon zet dan twee variabelen: `DATABASE_URL` (via een connectiepooler, voor de
app) en `DATABASE_URL_UNPOOLED` (een directe verbinding). Beide worden herkend —
de migraties nemen automatisch de directe verbinding, want daar werken ze niet
betrouwbaar doorheen een pooler.

**Werkt die pagina niet mee?** Vercel verhuist zijn opslag-aanbod met enige
regelmaat. Deze route werkt altijd, ongeacht hun indeling:

1. Maak een gratis account op [neon.tech](https://neon.tech)
2. Maak een project aan, regio *Europe (Frankfurt)*
3. Kopieer de **connection string** (begint met `postgresql://`)
4. Plak die bij Vercel als `DATABASE_URL`, via
   `https://vercel.com/<jouw-team>/gift-app/settings/environment-variables`

Krijg je van je hoster alleen een gepoolde verbinding, zet dan daarnaast
`DIRECT_URL` op de ongepoolde variant. Zonder pooler — lokaal, of bij zelf
hosten — hoef je niets extra's te doen.

### 5. Foto's koppelen (kan ook later)

Op dezelfde opslagpagina: **Create → Blob**. Een store aanmaken is niet genoeg —
open hem daarna en klik op **Connect Project**, kies `gift-app` en vink
**Production, Preview én Development** aan. Pas dan verschijnt
`BLOB_READ_WRITE_TOKEN` bij je omgevingsvariabelen, en pas na een **Redeploy**
ziet de draaiende app hem ook.

Kies je bij het koppelen een eigen voorvoegsel, dan heet de variabele
bijvoorbeeld `FOTOS_READ_WRITE_TOKEN`. Dat mag: de app zoekt zelf naar elke
variabele op `_READ_WRITE_TOKEN` met een Blob-sleutel erin.

Zonder Blob gaan foto's naar `public/uploads` op de server zelf. Ze worden dan
uitgeserveerd via `/api/photo/local/…` en niet als gewoon bestand: wat ná de
build in `public/` belandt, serveert `next start` namelijk niet meer.

Of je store nu op **openbaar** of op **besloten** staat maakt ook niet uit. Bij
een openbare store krijgen foto's een adres bij Vercel; bij een besloten store
zijn die adressen niet op te vragen, en lopen ze via `/api/photo/…` op je eigen
domein — dat haalt het bestand op met jouw sleutel en zet er een eeuwige
cachekop op, zodat het CDN het daarna zelf afhandelt. De app merkt bij de eerste
upload welke van de twee het is en onthoudt dat.

Onder **Instellingen → Foto-opslag** in de app zelf zit een knop **Opslag
testen**. Die zet een testbestandje neer, ruimt het weer op, en zegt of het
werkte — inclusief de naam van de variabele die hij gebruikte. Handig om te
controleren of deze stap gelukt is zonder er een echte foto voor te uploaden.

Sla je dit helemaal over, dan werkt de app volledig, behalve het uploaden van een
eigen foto — het bestandssysteem van Vercel is namelijk alleen-lezen. De app zegt
dat dan ook met zoveel woorden in plaats van een vage foutmelding. Foto's die uit
een productlink komen worden wél gewoon opgehaald.

### 6. Opnieuw deployen

Ga naar het tabblad **Deployments**, klik bij de bovenste op de drie puntjes en
kies **Redeploy**. Nu zijn alle variabelen er, worden de databasetabellen
aangemaakt en is de app in gebruik.

Vanaf nu deployt elke push naar `main` automatisch, en gaan wijzigingen aan het
datamodel vanzelf mee.

### 7. Je adres

Onder **Settings → Domains** staan al je adressen. Je hebt er twee soorten:

- `gift-app-<team>.vercel.app` — je **productie-adres**. Dít is het adres van je
  app, dat deel je met familie en vrienden.
- `gift-<willekeurige-code>-<team>.vercel.app` — een **deployment-adres**, dat
  hoort bij één specifieke build. Handig om een oude versie terug te kijken,
  maar niet om te delen: die zijn standaard afgeschermd.

Op dezelfde pagina kun je een kortere naam kiezen, bijvoorbeeld
`wenslijst.vercel.app`, of je eigen domeinnaam koppelen.

### 8. Het slot eraf halen

Vraagt je adres om in te loggen bij Vercel, ook in een browser waar je niet bent
ingelogd? Dan staat **Deployment Protection** aan. Zolang dat zo is kan niemand
je lijsten bekijken, want daar heb je nu juist een deelbare link voor nodig.

Ga naar **Settings → Deployment Protection** (of direct naar
`https://vercel.com/<jouw-team>/gift-app/settings/deployment-protection`) en zet
**Vercel Authentication** op **Disabled**. Vergeet niet op te slaan.

Dat is veilig: de app regelt zijn eigen accounts met e-mail en wachtwoord, en
gedeelde lijsten horen bereikbaar te zijn voor mensen zonder Vercel-account.
Privélijsten blijven privé, en deel-links blijven onraadbaar.

### Kort samengevat

| Variabele | Nodig? | Waar vandaan |
| --- | --- | --- |
| `DATABASE_URL` | ja | wordt gezet door de Neon/Postgres-koppeling (stap 4) |
| `DIRECT_URL` | alleen bij een pooler | ongepoolde verbinding voor migraties; Neons `DATABASE_URL_UNPOOLED` wordt vanzelf herkend |
| `AUTH_SECRET` | ja | zelf invullen, willekeurige tekens (stap 2) |
| `BLOB_READ_WRITE_TOKEN` | voor foto's | wordt gezet door de Blob-koppeling (stap 4) |

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

### Afbeeldingen

Een foto die je zelf kiest wordt **in de browser verkleind** voordat hij verstuurd
wordt (`lib/image-compress.ts`): maximaal 1600 pixels aan de lange zijde, en de
hoogste kwaliteit die onder de 500 kB blijft. Telefoonfoto's van een paar
megabyte worden dus niet geweigerd maar teruggebracht. Dat moet ook wel: Vercel
kapt verzoeken boven ongeveer 4,5 MB af, dus zo'n upload zou anders sowieso
stuklopen. Lukt het verkleinen niet — een kapot of onleesbaar bestand — dan
weigert de server hem alsnog, met uitleg.

Bij voorkeur wordt de foto gedownload en als eigen kopie opgeslagen, zodat hij
blijft werken als de webshop de originele URL wijzigt.

Lukt dat niet, dan gebruikt de app gewoon de originele URL. Dat gebeurt in twee
gevallen, en in allebei is een foto beter dan geen foto:

- **Er is geen opslag ingericht.** Zonder `BLOB_READ_WRITE_TOKEN` is het
  bestandssysteem op Vercel niet schrijfbaar. Voorheen verdween de foto dan
  helemaal.
- **Wij kunnen het plaatje niet downloaden.** Dat zegt niets over de bezoeker:
  die haalt de foto op vanaf zijn eigen verbinding, en daar heeft de winkel geen
  bezwaar tegen.

### Als een webshop ons buiten de deur houdt

Grote webshops — bol.com en Amazon voorop — laten geen verzoeken toe die van een
datacenter komen, en daar draait deze app op. Ze kijken naar het IP-adres, niet
naar wat je meestuurt. Er is dus geen header of instelling die dat omzeilt.

Let op: ze sturen daarbij lang niet altijd een foutcode. Amazon geeft een gewone
`200` terug met een controlepagina waarvan de `<title>` simpelweg "Amazon.nl"
is. `lib/scraper/junk.ts` herkent dat soort titels — winkelnamen, "Robot Check",
"Even geduld", foutcodes — en behandelt ze als "niets gevonden", zodat ze nooit
als productnaam in je lijst belanden.

Vervolgens zijn er twee vangnetten.

**1. Gratis leesdiensten** (`lib/scraper/readers.ts`). Die halen de pagina op
vanaf hun eigen infrastructuur en geven ons de inhoud terug:

| Dienst | Wat het teruggeeft | Kosten |
| --- | --- | --- |
| [r.jina.ai](https://jina.ai/reader/) | de pagina, inclusief wat JavaScript oplevert | gratis, geen sleutel nodig |
| [allorigins.win](https://allorigins.win) | de pagina onbewerkt | gratis, geen sleutel nodig |
| [codetabs.com](https://codetabs.com) | de pagina onbewerkt, andere infrastructuur | gratis, geen sleutel nodig |
| [microlink.io](https://microlink.io) | titel, omschrijving en afbeelding als JSON | gratis tot een bescheiden aantal per dag |
| [Internet Archive](https://web.archive.org) | een eerdere momentopname van de pagina | gratis |

**Ze vullen elkaar aan, veld voor veld.** Dat is het belangrijkste principe
hier: geeft de ene bron alleen een naam en de andere alleen een prijs, dan
gebruiken we ze allebei. Wat we al hebben blijft staan — eerdere bronnen zijn
betrouwbaarder dan latere — en alleen lege vakjes worden gevuld. Zodra naam,
prijs én foto binnen zijn stoppen we.

De eerste vier gaan **tegelijk** op pad, want welke dienst een winkel doorlaat
verschilt per geval en na elkaar proberen betekent dat de traagste bepaalt hoe
lang je wacht. De grens voor die ronde ligt op 18 seconden.

Het archief komt daarna, en alleen als er dán nog iets ontbreekt. Ook als de
live diensten al een naam vonden: een oude foto is nog steeds de juiste foto, en
een oude prijs is bruikbaarder dan een leeg vakje. Wordt het archief gebruikt,
dan meldt de app dat en vraagt hij je de prijs te controleren.

De hele keten:

```
1. zelf ophalen                          → werkt bij de meeste webshops
2. titel rommel? → telt als niets gevonden
3. jina / allorigins / codetabs / microlink, tegelijk, gaten vullen
4. het archief, voor wat dan nog leeg is
5. de link zelf, voor de laatste gaten   → naam uit het pad, foto via de ASIN
```

Ook hun eigen foutpagina's worden als rommel herkend — r.jina.ai antwoordt
bijvoorbeeld met de titel "IP address 34.96.49.86 is blocked" als een winkel
hén weert. Zonder die controle belandt dat als productnaam in je lijst.

Uit te zetten met `SCRAPER_READERS=off`; er gaan alleen openbare productlinks
naartoe.

**2. De link zelf** (`lib/scraper/from-url.ts`), voor wat dan nog leeg is:

- de productnaam staat meestal letterlijk in het pad —
  `…/p/lego-classic-creatieve-superset-11036/…` wordt "Lego classic creatieve
  superset 11036"
- bij Amazon zit de ASIN in de link, en daarmee kunnen we de foto rechtstreeks
  bij de afbeeldingsserver ophalen. Die staat los van de winkelpagina en heeft
  geen botcontrole
- de winkelnaam volgt uit het domein

Wat er ook misgaat, je krijgt altijd een formulier met zoveel mogelijk
ingevuld, en de app zegt erbij wat er nog ontbreekt. Toevoegen mislukt dus nooit
helemaal.

### De bewaarknop: de winkel omzeilen door het niet te proberen

Voor winkels die hardnekkig blijven weigeren is er een uitweg die principieel
niet te blokkeren is: de pagina helemaal niet ophalen, maar uitlezen in de
browser van de gebruiker zelf — op de productpagina die hij toch al bekijkt.
Voor de winkel is dat een gewone bezoeker.

Onder **Instellingen** staat een bladwijzer die je één keer installeert
(`lib/bookmarklet.ts`). Sta je later op een product, dan tik je erop; de
bladwijzer leest naam, prijs en foto uit de pagina — dezelfde volgorde als op de
server: JSON-LD, dan OpenGraph, dan de zichtbare tekst — en opent `/add` met
alles ingevuld. Daar kies je alleen nog de lijst.

Waarom dit via een bladwijzer moet en niet gewoon vanuit de app: een webpagina
mag de inhoud van een andere website niet lezen (CORS). Een bladwijzer draait
ín de pagina zelf en heeft die beperking niet. De gegevens gaan als
querystring mee naar `/add`, dus er is geen CORS en geen aparte inlog nodig.

Blijft ook dat te vaak misgaan, dan is een betaalde scraping-dienst
(ScrapingBee, Scrapfly, Zyte) de enige route die structureel werkt: die draaien
vanaf woonhuis-IP's. Dat is een bewuste keuze met een prijskaartje, dus die zit
niet ingebouwd.

Kleinere en middelgrote webshops doen meestal niet aan dit soort blokkades. Daar
werkt stap 1 gewoon volledig.

### Veiligheid van de scraper

`lib/scraper/safe-fetch.ts` voorkomt dat de app als proxy naar het interne
netwerk gebruikt kan worden (SSRF): alleen http/https, DNS-resolutie wordt
gecontroleerd op privé-, loopback- en link-local-adressen (ook bij elke
redirect), maximaal 3 redirects, 12 seconden time-out, 2 MB HTML en 5 MB per
afbeelding. Daarbovenop geldt een rate limit per gebruiker.

## Vrienden en zichtbaarheid

Een vriendschap staat één keer in de tabel, met de twee id's in een vaste
volgorde (`aId` is altijd de kleinste). Dat scheelt dubbele rijen en maakt "zijn
deze twee vrienden?" één opzoekactie. Een uitnodiging is een aparte rij die bij
accepteren verdwijnt; nodigen twee mensen elkaar tegelijk uit, dan worden ze
meteen vrienden in plaats van op elkaar te blijven wachten.

De vier standen van een lijst:

| Stand | Wie kan hem openen |
| --- | --- |
| Alleen ik | niemand anders; de deel-link doet niets |
| Alleen mijn vrienden | je vrienden, ingelogd; staat ook op je profiel voor hen |
| Iedereen met de link | iedereen die de link heeft, zonder account |
| Ook op mijn profiel | idem, plus zichtbaar op `/u/<handle>` |

De controle zit in de datalaag (`getListForVisitor`, `getPublicProfile`), niet in
de UI: een vriendenlijst opvragen zonder vriend te zijn levert gewoon niets op.

## Samen aan één lijst

De eigenaar staat niet in `ListMember` — dat is `List.userId`. Wie meedoet mag
alles met de cadeaus (`editableBy` in `lib/gifts.ts` laat eigenaar én deelnemers
door), maar de instellingen blijven van de eigenaar: die functies filteren op
`userId` en dat is precies de bedoeling, want wat de eigenaar kiest geldt voor
iedereen. Staat de lijst op "ook op mijn profiel", dan verschijnt hij dus op het
profiel van álle deelnemers.

Eén ding blijft daarbij van de deelnemer zelf: `ListMember.hiddenOnProfile`.
Wie de lijst niet op zijn eigen profiel wil, zet die vlag om via het paneel van
de lijst; `getPublicProfile` filtert er dan op, en alleen dat ene profiel
verandert. Op je eigen `/account` schuift de lijst mee naar de weggeklapte
lijsten, zodat wat je daar ziet klopt met wat een bezoeker krijgt.

Meedoen kan op twee manieren: een uitnodiging aan een vriend, die op het tabblad
Sociaal binnenkomt, of de link `/j/<code>` voor iemand buiten je vriendenlijst.
Meer dan tien mensen per lijst gaat niet; dat wordt bewaakt bij het uitnodigen
én bij het meedoen zelf, met een unit-test tegen de echte database erop.

## Hoe de verrassing bewaakt wordt

Dit zit in de datalaag, niet alleen in de UI (`lib/gifts.ts`):

- `getListForOwner()` selecteert **nooit** iets uit de `Claim`-tabel. De eigenaar
  kan claims dus ook niet uit een API-antwoord of de netwerk-tab vissen.
- `getListForVisitor()` geeft de claim-status wél terug — daar is die functie
  voor.

De end-to-end test controleert dit expliciet: na een claim mag de naam van de
koper nergens in de HTML van de eigenaar voorkomen.

## Opmaak: gemaakt voor de telefoon

De meeste mensen voegen cadeaus toe vanaf hun telefoon, dus daar is de opmaak
op gebouwd; het bureaublad krijgt vanaf `md` de bredere variant.

- **Navigatiebalk onderaan** (`components/bottom-nav.tsx`) met Lijsten,
  Instellingen en een knop in het midden. Op een breed scherm verdwijnt de balk
  en staat alles weer bovenin.
- **Schuifpanelen** (`components/sheet.tsx`, `components/sheets.tsx`) voor
  toevoegen. De plusknop opent een paneel dat omhoog schuift: bovenaan kies je
  in welke lijst(en) het cadeau komt — de lijst waar je in staat is al
  aangevinkt — daaronder plak je de link of vul je het zelf in. Een nieuwe lijst
  maken gaat via hetzelfde soort paneel, te openen met het plusje naast "Mijn
  lijsten" of het gestippelde vak onderaan de rij. Op een breed scherm staat het
  paneel gecentreerd in beeld in plaats van tegen de onderrand. Sluiten gaat
  door de bovenrand omlaag te slepen, naast het paneel te tikken of met Escape;
  bij slepen loopt de beweging door vanaf de plek waar je losliet.
- **Veilige zones**: `viewport-fit=cover` plus `env(safe-area-inset-*)`, zodat
  niets onder de inkeping of de streep van de iPhone verdwijnt.
- **Invoervelden op 16 px.** Onder die grens zoomt Safari op iPhone het scherm
  in zodra je een veld aantikt. Vanaf `sm` mag het weer compacter.
- **Raakdoelen van minstens 44 px** via `@media (pointer: coarse)`, en
  zweefeffecten alleen op schermen met een muis — op een touchscreen blijft zo'n
  effect na het tikken hangen.
- **Delen via het deelvenster van de telefoon** (`navigator.share`), met
  kopiëren naar het klembord als terugval. Overal waar er iets te delen valt
  staat dezelfde `ShareRow`: twee knoppen naast elkaar, en de link zelf in een
  veld dat wel in de paginastructuur staat maar niet in beeld — je deelt hem of
  je kopieert hem, uitschrijven hoeft niet.
- **Op je beginscherm te zetten**: `app/manifest.ts` en de iconen in `public/`
  laten de app starten zonder adresbalk, met een eigen icoon.

Op telefoonformaat staat de uitlogknop in de instellingen in plaats van in de
balk bovenaan — anders kom je er niet meer uit.

## Tests

```bash
npm test          # unit tests (prijzen, extractie, rommelfilter, SSRF-blokkade)
npm run typecheck # TypeScript
npm run test:e2e  # Playwright: de volledige doorloop plus de bewaarknop
```

De e2e-tests draaien in twee smaken: `chromium` op bureaubladformaat en
`mobiel` op de maat van een iPhone. Die laatste bewaakt de navigatiebalk, en
controleert dat geen enkele pagina zijwaarts wegschuift en dat de laatste knop
van een formulier niet achter de balk valt.

De bewaarknop wordt echt uitgevoerd in de e2e-test: er wordt een nagemaakte
webshoppagina geserveerd, de bookmarklet-code draait daarop, en we controleren
welke gegevens er in het formulier belanden.

Het `build`-script draait via `scripts/migrate.mjs` ook de migraties, zodat de
tabellen op Vercel vanzelf goed komen te staan. Is er geen `DATABASE_URL`, dan
worden die stilletjes overgeslagen en slaagt de build alsnog — dat is precies
wat een eerste deploy op Vercel nodig heeft. Is er wél een database en gaat de
migratie mis, dan faalt de build zoals het hoort.

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
  (app)/            dashboard, lijst bewerken, account, instellingen (ingelogd)
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
