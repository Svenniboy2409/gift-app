/**
 * Het cadeau van Wenslijst.
 *
 * Alle kleur komt uit de accentkleur van het moment: op een lijst met een
 * blauwe omslag is het logo blauw. Uit die ene kleur mengen we hieronder een
 * reeksje tinten — een lichter deksel, een donkerder zijkant, een bijna wit
 * lint — zodat het cadeau diepte heeft in plaats van één vlakke vorm.
 *
 * Let op bij het aanpassen: de kleuren staan als platte `fill` op de vormen
 * zelf, en de verlopen in `<defs>` zijn kleurloos (alleen zwart of wit met
 * doorzichtigheid). Dat is met opzet. Staat het logo twee keer op een pagina,
 * dan verwijzen beide `url(#…)`-aanroepen naar dezelfde definitie — de eerste
 * in het document. Zat de accentkleur ín dat verloop, dan zou het tweede logo
 * de kleur van het eerste krijgen.
 */
export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
      style={
        {
          "--logo-deksel": "color-mix(in srgb, var(--accent) 76%, white)",
          "--logo-diep": "color-mix(in srgb, var(--accent) 62%, black)",
          "--logo-lint": "color-mix(in srgb, var(--accent) 8%, white)",
        } as React.CSSProperties
      }
    >
      <defs>
        {/* Kleurloos: zie de uitleg hierboven. */}
        <linearGradient id="wl-schaduw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="wl-glans" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wl-onderrand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Een zweem schaduw onder de doos, zodat hij ergens op staat. */}
      <ellipse cx="16" cy="29.4" rx="10" ry="1.3" fill="var(--logo-diep)" opacity="0.2" />

      {/* De doos, met het licht van boven en een donkerder rechterzijde. */}
      <path
        d="M5 15.4h22v11a2.6 2.6 0 0 1-2.6 2.6H7.6A2.6 2.6 0 0 1 5 26.4v-11Z"
        fill="var(--accent)"
      />
      <path
        d="M5 15.4h22v11a2.6 2.6 0 0 1-2.6 2.6H7.6A2.6 2.6 0 0 1 5 26.4v-11Z"
        fill="url(#wl-schaduw)"
      />
      {/* Begint pas onder het deksel: anders loopt er een naad over de doos. */}
      <path
        d="M16 16.1h11v10.3a2.6 2.6 0 0 1-2.6 2.6H16V16.1Z"
        fill="#000"
        opacity="0.1"
      />

      {/* Het deksel werpt een schaduw op de doos; die vervaagt, anders trekt
          hij een harde streep dwars over het cadeau. */}
      <rect x="5" y="16.1" width="22" height="2.4" fill="url(#wl-onderrand)" />

      {/* Het lint over de doos, met een randje schaduw aan de linkerkant. */}
      <rect x="13.7" y="15.4" width="4.6" height="13.6" fill="var(--logo-lint)" />
      <rect x="13.7" y="15.4" width="0.8" height="13.6" fill="#000" opacity="0.1" />

      {/* Het deksel steekt een klein beetje uit en vangt het licht. */}
      <rect x="2.8" y="10.2" width="26.4" height="5.9" rx="1.9" fill="var(--logo-deksel)" />
      <rect x="2.8" y="10.2" width="26.4" height="2.6" rx="1.3" fill="url(#wl-glans)" />
      <rect x="13.7" y="10.2" width="4.6" height="5.9" fill="var(--logo-lint)" />
      <rect x="13.7" y="10.2" width="0.8" height="5.9" fill="#000" opacity="0.08" />

      {/* De strik: twee lussen als gedraaide ellipsen, met in elke lus een
          donkerder ovaal — dat gaatje is wat een lus een lus maakt. Losse
          linten eronder worden bij 28 pixels alleen maar rommelig. */}
      <g transform="rotate(-38 11.4 7.2)">
        <ellipse cx="11.4" cy="7.2" rx="4" ry="2.5" fill="var(--logo-lint)" />
        <ellipse cx="12.4" cy="7.4" rx="2.1" ry="0.9" fill="#000" opacity="0.13" />
      </g>
      <g transform="rotate(38 20.6 7.2)">
        <ellipse cx="20.6" cy="7.2" rx="4" ry="2.5" fill="var(--logo-lint)" />
        <ellipse cx="19.6" cy="7.4" rx="2.1" ry="0.9" fill="#000" opacity="0.13" />
      </g>

      {/* De knoop ligt over de lussen en over de rand van het deksel heen. */}
      <rect x="14.2" y="8.6" width="3.6" height="3.2" rx="1.6" fill="var(--logo-lint)" />
      <path
        d="M14.2 10.4c0 1 .8 1.6 1.8 1.6s1.8-.6 1.8-1.6v.2c0 1-.8 1.6-1.8 1.6s-1.8-.6-1.8-1.6v-.2Z"
        fill="#000"
        opacity="0.16"
      />
    </svg>
  );
}
