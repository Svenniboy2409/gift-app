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
 */
export function buildBookmarklet(origin: string) {
  const source = `(function(){
var d=document,L={};
function m(n){var e=d.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e?e.getAttribute('content')||'':''}
function abs(u){try{return u?new URL(u,location.href).href:''}catch(e){return ''}}
function walk(x){
if(!x||typeof x!=='object')return;
if(Array.isArray(x))return x.forEach(walk);
if(x['@graph'])walk(x['@graph']);
var t=x['@type'];t=Array.isArray(t)?t.join(' '):String(t||'');
if(/product/i.test(t)){
if(!L.title&&x.name)L.title=x.name;
if(!L.image){var i=x.image;if(Array.isArray(i))i=i[0];if(i&&typeof i==='object')i=i.url;if(typeof i==='string')L.image=i}
var o=x.offers;if(Array.isArray(o))o=o[0];
if(o&&!L.price){var p=o.price||o.lowPrice;if(p!=null){L.price=String(p);L.cur=o.priceCurrency||''}}
}
for(var k in x){if(k!=='@graph')walk(x[k])}
}
var s=d.querySelectorAll('script[type="application/ld+json"]');
for(var j=0;j<s.length;j++){try{walk(JSON.parse(s[j].textContent))}catch(e){}}
var h1=d.querySelector('h1');
var title=L.title||m('og:title')||(h1?h1.textContent:'')||d.title||'';
var image=abs(L.image||m('og:image:secure_url')||m('og:image')||m('twitter:image'));
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
