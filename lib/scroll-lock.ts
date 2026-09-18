/**
 * De pagina eronder stil houden zolang er een paneel openstaat.
 *
 * `overflow: hidden` op de body lijkt genoeg, en op een bureaublad is dat ook
 * zo — maar op een iPhone niet. Safari laat je daar met je vinger gewoon door
 * de pagina erachter bladeren, en veert bovendien alle kanten op mee. Het
 * paneel staat dan stil terwijl alles eronder beweegt, en dat voelt los.
 *
 * Wat wél werkt is de body vastzetten met `position: fixed` op precies de plek
 * waar je gebleven was. Er valt dan niets meer te schuiven. Bij het loslaten
 * zetten we hem terug op die plek, zodat je niet plotseling bovenaan de pagina
 * staat.
 */

let diepte = 0;
let bewaardeScrollY = 0;
let bewaardPad = "";
let bewaardeStijl: {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  paddingRight: string;
} | null = null;

export function lockScroll() {
  diepte += 1;
  if (diepte > 1) return;

  bewaardeScrollY = window.scrollY;
  bewaardPad = window.location.pathname;
  const stijl = document.body.style;
  bewaardeStijl = {
    position: stijl.position,
    top: stijl.top,
    left: stijl.left,
    right: stijl.right,
    width: stijl.width,
    paddingRight: stijl.paddingRight,
  };

  // Op een bureaublad verdwijnt de schuifbalk zodra de body vaststaat, en
  // schuift alles een centimeter opzij. Die breedte vangen we hier op.
  const balk = window.innerWidth - document.documentElement.clientWidth;

  stijl.position = "fixed";
  stijl.top = `-${bewaardeScrollY}px`;
  stijl.left = "0";
  stijl.right = "0";
  stijl.width = "100%";
  if (balk > 0) stijl.paddingRight = `${balk}px`;
}

export function unlockScroll() {
  diepte = Math.max(0, diepte - 1);
  if (diepte > 0 || !bewaardeStijl) return;

  const stijl = document.body.style;
  stijl.position = bewaardeStijl.position;
  stijl.top = bewaardeStijl.top;
  stijl.left = bewaardeStijl.left;
  stijl.right = bewaardeStijl.right;
  stijl.width = bewaardeStijl.width;
  stijl.paddingRight = bewaardeStijl.paddingRight;
  bewaardeStijl = null;

  // Terug naar waar je was; zonder dit sta je opeens bovenaan. Maar alleen op
  // dezelfde pagina: sluit het paneel doordat je ergens heen gaat — een nieuwe
  // lijst maken brengt je meteen naar die lijst — dan hoort de nieuwe pagina
  // gewoon bovenaan te beginnen.
  if (window.location.pathname === bewaardPad) {
    window.scrollTo(0, bewaardeScrollY);
  }
}
