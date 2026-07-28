/**
 * De bewaarknop: een stukje JavaScript dat je als bladwijzer opslaat.
 *
 * Waarom dit werkt waar de server faalt: dit draait in jouw eigen browser, op
 * de productpagina die je op dat moment al bekijkt. Voor de webshop ben je
 * gewoon een bezoeker, dus er valt niets te blokkeren. De pagina wordt niet
 * opgehaald maar uitgelezen uit wat er al staat.
 *
 * Wat het ophaalt is dezelfde keten als op de server: JSON-LD, dan OpenGraph,
 * dan de zichtbare pagina. Daarna opent het /add met alles ingevuld.
 *
 * Belangrijk: naam, prijs en foto komen uit hetzelfde JSON-LD-blok. Een
 * productpagina bevat er meestal meerdere — het product zelf plus aanbevelingen
 * eronder — en per veld los zoeken levert dan de foto van een willekeurig
 * ander product op.
 */
export function buildBookmarklet(origin: string) {
  const source = `(function(){
var d=document,L={};
function m(n){var e=d.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e?e.getAttribute('content')||'':''}
function abs(u){try{return u?new URL(u,location.href).href:''}catch(e){return ''}}
function junk(u){return !u||/logo|sprite|icon|placeholder|oeps|oops|error|no[-_]?image|thumb/i.test(u)}
var P=null;
function walk(x){
if(!x||typeof x!=='object')return;
if(Array.isArray(x))return x.forEach(walk);
var t=x['@type'];t=Array.isArray(t)?t.join(' '):String(t||'');
if(!P&&/product/i.test(t)&&x.name)P=x;
if(x['@graph'])walk(x['@graph']);
for(var k in x){if(k!=='@graph')walk(x[k])}
}
var s=d.querySelectorAll('script[type="application/ld+json"]');
for(var j=0;j<s.length;j++){try{walk(JSON.parse(s[j].textContent))}catch(e){}}
if(P){
L.title=P.name;
var i=P.image;
if(Array.isArray(i))i=i[0];
if(i&&typeof i==='object')i=i.url||i.contentUrl;
if(typeof i==='string'&&!junk(i))L.image=i;
var o=P.offers;if(Array.isArray(o))o=o[0];
if(o){var pr=o.price!=null?o.price:o.lowPrice;if(pr!=null){L.price=String(pr);L.cur=o.priceCurrency||''}}
}
var h1=d.querySelector('h1');
var title=L.title||m('og:title')||(h1?h1.textContent:'')||d.title||'';
var og=m('og:image:secure_url')||m('og:image')||m('twitter:image');
var image=abs(L.image||og);
if(junk(image))image=abs(og);
var price=L.price||m('product:price:amount')||m('og:price:amount')||'';
var cur=L.cur||m('product:price:currency')||m('og:price:currency')||'EUR';
if(!price){var t=(d.body?d.body.innerText:'')||'';var mm=t.match(/(?:€|EUR)\\s?\\d[\\d.,]*/);if(mm)price=mm[0]}
var q='url='+encodeURIComponent(location.href)+
'&title='+encodeURIComponent(String(title).replace(/\\s+/g,' ').trim().slice(0,160))+
'&image='+encodeURIComponent(String(image).slice(0,1000))+
'&price='+encodeURIComponent(String(price).slice(0,20))+
'&currency='+encodeURIComponent(String(cur).slice(0,3));
var u='${origin}/add?'+q;
var w=window.open(u,'_blank');
if(!w)location.href=u;
})();`;

  // Alles op één regel, want een bladwijzer kan geen regeleindes bevatten.
  return `javascript:${encodeURIComponent(source.replace(/\n/g, ""))}`;
}
