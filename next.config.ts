import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Hoe lang een vooruit opgehaalde pagina mag blijven liggen.
     *
     * De navigatiebalk en de lijstkaartjes halen hun pagina alvast op, zodat
     * aantikken meteen raak is in plaats van een seconde of wat wachten. De
     * keerzijde: wat opgehaald is, blijft even liggen. Standaard vijf minuten,
     * en dat is lang voor een lijst die je samen met iemand invult — voegt de
     * ander een cadeau toe, dan zou je dat vijf minuten niet zien.
     *
     * Je eigen wijzigingen komen hier niet door in de knel: elke serveractie
     * roept revalidatePath aan, en dat gooit het bewaarde exemplaar meteen weg.
     * Deze minuut gaat alleen over wat iemand anders verandert.
     */
    staleTimes: { static: 60 },
  },
};

export default nextConfig;
