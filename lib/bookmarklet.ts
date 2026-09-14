import { SITE_RULES } from "@/lib/scraper/sites";

/**
 * De bewaarknop: een stukje JavaScript dat je als bladwijzer opslaat.
 *
 * Waarom dit werkt waar de server faalt: dit draait in jouw eigen browser, op
 * de productpagina die je op dat moment al bekijkt. Voor de webshop ben je
 * gewoon een bezoeker, dus er valt niets te blokkeren. De pagina wordt niet
 * opgehaald maar uitgelezen uit wat er al staat.
 *
 * De volgorde is dezelfde als op de server: de productgegevens (JSON-LD), dan
 * de selectors die we per winkel kennen, dan OpenGraph, en pas als laatste wat
 * er zichtbaar op de pagina staat. Structuur gaat dus altijd voor gokwerk.
 *
 * Twee dingen gaan gemakkelijk mis, en daar is dit op gebouwd:
 *
 * 1. Een productpagina bevat meestal meerdere producten in zijn gegevens — het
 *    product zelf, de aanbevelingen eronder, en soms een besproken product uit
 *    een review. Wie blind het eerste pakt, krijgt een willekeurig ander
 *    product met een willekeurig andere prijs. We dalen daarom alleen af langs
 *    velden die naar het product van déze pagina wijzen.
 * 2. Eén product heeft vaak meerdere aanbiedingen: de winkel zelf, andere
 *    verkopers, tweedehands. Nieuw en op voorraad gaat voor; pas daarna telt
 *    de volgorde van de winkel.
 *
 * Voor de foto sturen we een handvol kandidaten mee, op volgorde van
 * betrouwbaarheid. Webshops zetten video's tussen hun productfoto's en zijn het
 * niet eens over de volgorde, dus de eerste gok is niet altijd raak. Op het
 * bewaarscherm kun je er dan zelf een aanwijzen.
 *
 * Let op bij het aanpassen: alle regeleindes gaan er onderaan uit, want een
 * bladwijzer is één regel. Gebruik dus geen //-commentaar en sluit elke
 * opdracht af met een puntkomma.
 */
export function buildBookmarklet(origin: string) {
  /** Dezelfde winkelregels als de server, maar dan compact. */
  const rules = JSON.stringify(
    SITE_RULES.map((rule) => ({
      d: rule.domain,
      t: rule.title ?? null,
      p: rule.price ?? null,
      i: rule.image ?? null,
      f: rule.preferPrice ? 1 : 0,
    })),
  );

  const source = `(function(){
var d=document,loc=location,RULES=${rules};

/* ---- kleine hulpjes ---- */
function txt(v){return String(v==null?'':v).replace(/\\s+/g,' ').trim()}
function m(n){var e=d.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e?txt(e.getAttribute('content')):''}
function abs(u){try{return u?new URL(u,loc.href).href:''}catch(e){return ''}}

/* Prijs uit de productgegevens: machinaal genoteerd, punt is het
   decimaalteken ("349.00"). */
function mcents(v){
if(v==null||typeof v==='object')return null;
var t=txt(v);if(!t)return null;
var n=/^\\d+,\\d{1,2}$/.test(t)?t.replace(',','.'):t.replace(/,/g,'');
var a=parseFloat(n);
if(!isFinite(a)||a<0||a>1000000)return null;
return Math.round(a*100);
}
/* Prijs uit zichtbare tekst: "€ 1.299,00", "19,95", "1,299.00". Welk teken
   het decimaalteken is blijkt uit welk teken het laatst staat. */
function cents(v){
if(v==null)return null;
var t=txt(v).replace(/[\\u00a0\\u202f]/g,'');
var f=/\\d[\\d.,\\s]*\\d|\\d/.exec(t);if(!f)return null;
var n=f[0].replace(/\\s/g,'');
var lc=n.lastIndexOf(','),ld=n.lastIndexOf('.');
var sep=lc>ld?',':(ld>lc?'.':'');
var out;
if(sep){
var at=n.lastIndexOf(sep),dec=n.length-at-1;
out=(dec===1||dec===2)?n.slice(0,at).replace(/[.,]/g,'')+'.'+n.slice(at+1):n.replace(/[.,]/g,'');
}else{out=n}
var a=parseFloat(out);
if(!isFinite(a)||a<0||a>1000000)return null;
return Math.round(a*100);
}

/* ---- productgegevens (JSON-LD) ---- */
/* Alleen deze velden wijzen naar het product van de pagina zelf. Juist niet
   itemListElement, review of isRelatedTo: daar staan de buren in. */
var FOLLOW=['@graph','mainEntity','mainEntityOfPage','about'];
var products=[];
function walk(x){
if(!x||typeof x!=='object')return;
if(Array.isArray(x)){for(var i=0;i<x.length;i++)walk(x[i]);return}
var t=x['@type'];t=Array.isArray(t)?t.join(' '):String(t||'');
if(/\\bproduct(group|model)?\\b/i.test(t)&&x.name)products.push(x);
for(var k=0;k<FOLLOW.length;k++)if(x[FOLLOW[k]])walk(x[FOLLOW[k]]);
}
var blocks=d.querySelectorAll('script[type="application/ld+json"]');
for(var b=0;b<blocks.length;b++){try{walk(JSON.parse(blocks[b].textContent))}catch(e){}}

/* Staan er meerdere, dan wint degene die past bij wat er groot op de pagina
   staat. */
function chooseProduct(hint){
if(products.length<2)return products[0]||null;
var h=txt(hint).toLowerCase();
if(h){for(var i=0;i<products.length;i++){
var n=txt(products[i].name).toLowerCase();
if(n&&(h.indexOf(n)>=0||n.indexOf(h)>=0))return products[i];
}}
return products[0];
}

/* ---- aanbiedingen ---- */
function offerList(p){
var out=[];
(function add(o){
if(!o)return;
if(Array.isArray(o)){for(var i=0;i<o.length;i++)add(o[i]);return}
if(typeof o!=='object')return;
if(o.offers)add(o.offers);
out.push(o);
})(p&&p.offers);
return out;
}
function offerPrice(o){
if(o.price!=null&&o.price!=='')return o.price;
var s=o.priceSpecification;
if(Array.isArray(s))s=s[0];
if(s&&typeof s==='object'){
if(s.price!=null)return s.price;
if(s.minPrice!=null)return s.minPrice;
}
return o.lowPrice!=null?o.lowPrice:null;
}
function chooseOffer(p){
var all=[],list=offerList(p),i;
for(i=0;i<list.length;i++)if(offerPrice(list[i])!=null)all.push(list[i]);
if(!all.length)return null;
var nieuw=[];
for(i=0;i<all.length;i++)if(!/used|refurb|damaged|open[-_ ]?box|tweedehands/i.test(String(all[i].itemCondition||'')))nieuw.push(all[i]);
var use=nieuw.length?nieuw:all;
var voorraad=[];
for(i=0;i<use.length;i++)if(!/outofstock|soldout|discontinued/i.test(String(use[i].availability||'').replace(/[\\s_-]/g,'')))voorraad.push(use[i]);
return (voorraad.length?voorraad:use)[0];
}

/* ---- winkelregels ---- */
var host=loc.hostname.replace(/^www\\./,''),rule=null;
for(var r=0;r<RULES.length;r++){
if(host===RULES[r].d||host.slice(-(RULES[r].d.length+1))==='.'+RULES[r].d){rule=RULES[r];break}
}
function pick(list){
if(!list)return '';
for(var i=0;i<list.length;i++){
var e;try{e=d.querySelector(list[i])}catch(err){continue}
if(!e)continue;
var v=txt(e.getAttribute('content')||e.textContent);
if(v)return v;
}
return '';
}
/* Nederlandse webshops schrijven hun prijs vaak als "29" met de centen in een
   superscript ernaast. De tekst van zo'n element is dan "2999", en dat leest
   als tweeduizend euro. Het staartje halen we er apart uit. */
function pickPrice(list){
if(!list)return '';
for(var i=0;i<list.length;i++){
var e;try{e=d.querySelector(list[i])}catch(err){continue}
if(!e)continue;
var attr=txt(e.getAttribute('content'));
if(attr)return attr;
var kopie=e.cloneNode(true);
var frac=kopie.querySelector('sup,[class*="fraction" i],[class*="cents" i],[class*="decimal" i]');
if(frac){
var c=txt(frac.textContent);
if(/^\\d{1,2}$/.test(c)){
frac.parentNode.removeChild(frac);
var heel=txt(kopie.textContent);
if(heel&&/\\d/.test(heel))return heel+','+c;
}
}
var v=txt(e.textContent);
if(v)return v;
}
return '';
}

/* ---- zichtbare prijs, als laatste redmiddel ---- */
function visiblePrice(){
var e=d.querySelector('[itemprop="price"]');
if(e){
var a=e.getAttribute('content');
var c=a?mcents(a):cents(e.textContent);
if(c)return c;
}
var nodes=d.querySelectorAll('[class*="price" i],[class*="prijs" i],[id*="price" i],[data-test*="price" i],[data-testid*="price" i]');
for(var i=0;i<nodes.length&&i<60;i++){
var el=nodes[i];
var cn=el.className;
cn=(cn&&cn.baseVal!==undefined?cn.baseVal:String(cn||''))+' '+(el.id||'');
/* Doorgestreepte prijzen, adviesprijzen, verzendkosten en "vanaf" horen er
   niet bij. */
if(/was|old|oud|strike|through|list|advies|vanaf|from|compare|shipping|verzend|delivery|unit|per[-_]/i.test(cn))continue;
if(el.closest&&el.closest('del,s,strike'))continue;
try{var st=getComputedStyle(el);if(st&&String(st.textDecorationLine||st.textDecoration||'').indexOf('line-through')>=0)continue}catch(err){}
var t=txt(el.textContent);
if(!t||t.length>40)continue;
if(!/[€$£]|\\bEUR\\b/i.test(t)&&!/^\\d{1,6}[.,]\\d{2}$/.test(t))continue;
var c2=cents(t);
if(c2)return c2;
}
return null;
}

/* ---- titel ---- */
/* "Blauwe trui | bol.com" en "Talking Flower : Amazon.nl: Games" worden
   ingekort tot het productdeel. */
function trimSite(t){
if(!t)return '';
var names=[m('og:site_name'),host,host.split('.')[0]];
for(var i=0;i<names.length;i++){
var n=names[i];if(!n)continue;
var esc=String(n).replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&');
var kort=t.replace(new RegExp('\\\\s*[|\\\\-\\u2013\\u2014:\\u00b7]\\\\s*'+esc+'\\\\b[\\\\s\\\\S]*$','i'),'');
kort=txt(kort);
if(kort.length>=8)t=kort;
}
return txt(t);
}

var P=chooseProduct(m('og:title')||(d.querySelector('h1')?d.querySelector('h1').textContent:''));
var h1=d.querySelector('h1');
var title=trimSite(txt(P&&P.name)||pick(rule&&rule.t)||m('og:title')||txt(h1&&h1.textContent)||d.title);

/* ---- prijs: structuur eerst, gokwerk pas als laatste ---- */
var offer=chooseOffer(P);
var siteCents=cents(pickPrice(rule&&rule.p));
var cur=(offer&&offer.priceCurrency)||m('product:price:currency')||m('og:price:currency')||'EUR';
if(typeof cur!=='string')cur='EUR';
var bedrag=null;
if(rule&&rule.f&&siteCents)bedrag=siteCents;
if(bedrag==null&&offer)bedrag=mcents(offerPrice(offer));
if(bedrag==null&&siteCents)bedrag=siteCents;
if(bedrag==null)bedrag=mcents(m('product:price:amount')||m('og:price:amount'));
if(bedrag==null)bedrag=visiblePrice();

/* ---- foto's ---- */
function junk(u){return !u||!/^https?:/i.test(u)||/logo|sprite|icon|placeholder|oeps|oops|error|no[-_]?image|avatar|badge|flag|video|poster|youtube|vimeo|play[-_]?button/i.test(u)}
var ldImages=[];
if(P){
var im=P.image;if(!Array.isArray(im))im=[im];
for(var n2=0;n2<im.length;n2++){var v2=im[n2];if(v2&&typeof v2==='object')v2=v2.url||v2.contentUrl;if(typeof v2==='string')ldImages.push(v2)}
}
/* De foto's uit de pagina zelf, op volgorde van hoe groot ze in beeld staan.
   De hoofdfoto is vrijwel altijd de grootste. */
function domImages(){
var out=[],all=d.images||[],k;
for(k=0;k<all.length;k++){
var el2=all[k],src=el2.currentSrc||el2.src||'';
var w=el2.naturalWidth||el2.width||0,h=el2.naturalHeight||el2.height||0;
if(w<200||h<200)continue;
out.push({u:src,a:w*h});
}
out.sort(function(x,y){return y.a-x.a});
return out.map(function(x){return x.u});
}
/* Volgorde: og:image is de foto die de winkel zelf als hoofdfoto aanwijst en
   is daarmee het betrouwbaarst. Daarna de foto's uit de productgegevens, de
   selector die we van deze winkel kennen, en wat er groot in beeld staat. */
var cands=[m('og:image:secure_url'),m('og:image'),m('twitter:image')]
.concat(ldImages).concat([pick(rule&&rule.i)]).concat(domImages());
var seen={},images=[];
for(var c=0;c<cands.length;c++){
var u=abs(cands[c]);
if(!u||junk(u)||seen[u])continue;
seen[u]=1;images.push(u);
if(images.length>=5)break;
}

var q='url='+encodeURIComponent(loc.href)+
'&title='+encodeURIComponent(String(title).slice(0,160))+
'&image='+encodeURIComponent(String(images[0]||'').slice(0,1000))+
'&images='+encodeURIComponent(images.slice(0,5).join(' ').slice(0,1600))+
'&cents='+(bedrag==null?'':bedrag)+
'&currency='+encodeURIComponent(String(cur).slice(0,3));
var u2='${origin}/add?'+q;
var w2=window.open(u2,'_blank');
if(!w2)loc.href=u2;
})();`;

  // Wat de browser krijgt mag kaal: het commentaar hierboven is voor wie het
  // onderhoudt, niet voor de bladwijzer. En alles gaat op één regel, want een
  // bladwijzer kan geen regeleindes bevatten.
  const kaal = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n/g, "");
  return `javascript:${encodeURIComponent(kaal)}`;
}
