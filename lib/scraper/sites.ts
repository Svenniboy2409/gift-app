/**
 * Extra CSS-selectors per webshop. Ze worden pas gebruikt als de generieke
 * uitlezing (JSON-LD / microdata / OpenGraph) een veld niet heeft gevonden,
 * behalve waar `preferPrice` aanstaat — sommige shops zetten in OpenGraph een
 * verkeerde of verouderde prijs.
 */
export type SiteRule = {
  /** Domein zonder www., bijv. "bol.com". Matcht ook subdomeinen. */
  domain: string;
  merchant: string;
  title?: string[];
  price?: string[];
  image?: string[];
  /** Prijs uit deze selectors wint van de generieke prijs. */
  preferPrice?: boolean;
};

export const SITE_RULES: SiteRule[] = [
  {
    domain: "bol.com",
    merchant: "bol",
    title: ['[data-test="title"]', "h1 span.u-mrs--m", "h1"],
    price: ['[data-test="price"]', ".promo-price", "span.promo-price"],
    image: ['[data-test="image"] img', ".product-image img", "img.js_inline_zoom"],
    preferPrice: true,
  },
  {
    domain: "coolblue.nl",
    merchant: "Coolblue",
    title: ['h1[data-testid="product-title"]', ".product-screen h1", "h1"],
    price: ['[data-testid="sales-price-current"]', ".sales-price__current"],
    image: [".js-product-images img", ".product-image img"],
    preferPrice: true,
  },
  {
    domain: "amazon.nl",
    merchant: "Amazon",
    title: ["#productTitle", "#title span"],
    price: [
      "#corePrice_feature_div .a-offscreen",
      ".priceToPay .a-offscreen",
      "#priceblock_ourprice",
      ".a-price .a-offscreen",
    ],
    image: ["#landingImage", "#imgBlkFront", "#main-image"],
    preferPrice: true,
  },
  {
    domain: "amazon.com",
    merchant: "Amazon",
    title: ["#productTitle"],
    price: ["#corePrice_feature_div .a-offscreen", ".a-price .a-offscreen"],
    image: ["#landingImage", "#imgBlkFront"],
    preferPrice: true,
  },
  {
    domain: "amazon.de",
    merchant: "Amazon",
    title: ["#productTitle"],
    price: ["#corePrice_feature_div .a-offscreen", ".a-price .a-offscreen"],
    image: ["#landingImage", "#imgBlkFront"],
    preferPrice: true,
  },
  {
    domain: "mediamarkt.nl",
    merchant: "MediaMarkt",
    title: ['h1[data-test="mms-select-details-header"]', "h1"],
    price: ['[data-test="branded-price-whole-value"]', '[data-test="mms-product-price"]'],
    image: ['[data-test="mms-image-viewer"] img', "picture img"],
  },
  {
    domain: "zalando.nl",
    merchant: "Zalando",
    title: ['h1 span[class*="EKabf7"]', "h1"],
    price: ['[data-testid="pdp-price"]', 'span[class*="price"]'],
    image: ["#pdp-gallery img", "picture img"],
  },
  {
    domain: "hema.nl",
    merchant: "HEMA",
    title: ["h1.product-title", "h1"],
    price: [".product-price", '[data-test="product-price"]'],
    image: [".product-image img", "picture img"],
  },
  {
    domain: "ikea.com",
    merchant: "IKEA",
    title: ["h1.pip-header-section__title--big", "h1"],
    price: [".pip-temp-price__integer", ".pip-price__integer"],
    image: [".pip-media-grid img", "img.pip-image"],
  },
  {
    domain: "action.com",
    merchant: "Action",
    title: ["h1.product-detail__title", "h1"],
    price: [".product-detail__price", ".price"],
    image: [".product-detail__image img", "picture img"],
  },
  {
    domain: "wehkamp.nl",
    merchant: "Wehkamp",
    title: ['[data-testid="product-title"]', "h1"],
    price: ['[data-testid="product-price"]', ".price"],
    image: ['[data-testid="product-image"] img', "picture img"],
  },
  {
    domain: "etsy.com",
    merchant: "Etsy",
    title: ['h1[data-buy-box-listing-title]', "h1"],
    price: ['[data-selector="price-only"]', ".wt-text-title-larger"],
    image: ["img.wt-max-width-full", "#image-carousel img"],
  },
  {
    domain: "decathlon.nl",
    merchant: "Decathlon",
    title: ["h1.title", "h1"],
    price: [".prc__active-price", ".price"],
    image: [".product-image img", "picture img"],
  },
];

/** Zoekt de regel die bij deze hostname hoort. */
export function findSiteRule(hostname: string): SiteRule | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return (
    SITE_RULES.find(
      (rule) => host === rule.domain || host.endsWith(`.${rule.domain}`),
    ) ?? null
  );
}

/** Nette winkelnaam voor in de UI, ook voor shops zonder eigen regel. */
export function merchantFromHost(hostname: string) {
  const rule = findSiteRule(hostname);
  if (rule) return rule.merchant;
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const label = host.split(".")[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}
