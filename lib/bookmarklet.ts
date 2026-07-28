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
 *
 * Voor de foto sturen we bovendien een handvol kandidaten mee, op volgorde van
 * betrouwbaarheid. Webshops zetten video's tussen hun productfoto's en zijn het
 * niet eens over de volgorde, dus de eerste gok is niet altijd raak. Op het
 * bewaarscherm kun je er dan zelf een aanwijzen.
 */
export function buildBookmarklet(origin: string) {
  const source = `(function(){
var d=document,L={};
function m(n){var e=d.querySelector('meta[property="'+n+'"],meta[name="'+n+'"]');return e?e.getAttribute('content')||'':''}
function abs(u){try{return u?new URL(u,location.href).href:''}catch(e){return ''}}
/* Logo's, iconen, foutplaatjes — en posters van video's, want die staan bij
   webshops gewoon tussen de productfoto's. */
function junk(u){return !u||!/^https?:/i.test(u)||/logo|sprite|icon|placeholder|oeps|oops|error|no[-_]?image|avatar|badge|flag|video|poster|youtube|vimeo|play[-_]?button/i.test(u)}
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
var ldImages=[];
if(P){
L.title=P.name;
var i=P.image;if(!Array.isArray(i))i=[i];
for(var n=0;n<i.length;n++){var v=i[n];if(v&&typeof v==='object')v=v.url||v.contentUrl;if(typeof v==='string')ldImages.push(v)}
var o=P.offers;if(Array.isArray(o))o=o[0];
if(o){var pr=o.price!=null?o.price:o.lowPrice;if(pr!=null){L.price=String(pr);L.cur=o.priceCurrency||''}}
}
var h1=d.querySelector('h1');
var title=L.title||m('og:title')||(h1?h1.textContent:'')||d.title||'';
/* De foto's uit de pagina zelf, op volgorde van hoe groot ze in beeld staan.
   De hoofdfoto is vrijwel altijd de grootste. */
function domImages(){
var out=[],all=d.images||[],k;
for(k=0;k<all.length;k++){
var el=all[k],src=el.currentSrc||el.src||'';
var w=el.naturalWidth||el.width||0,h=el.naturalHeight||el.height||0;
if(w<200||h<200)continue;
out.push({u:src,a:w*h});
}
out.sort(function(x,y){return y.a-x.a});
return out.map(function(x){return x.u});
}
/* Volgorde: og:image is de foto die de winkel zelf als hoofdfoto aanwijst en
   is daarmee het betrouwbaarst. Daarna de foto's uit de productgegevens, en
   als laatste wat er groot in beeld staat. */
var cands=[m('og:image:secure_url'),m('og:image'),m('twitter:image')]
.concat(ldImages).concat(domImages());
var seen={},images=[];
for(var c=0;c<cands.length;c++){
var u=abs(cands[c]);
if(!u||junk(u)||seen[u])continue;
seen[u]=1;images.push(u);
if(images.length>=5)break;
}
var image=images[0]||'';
var price=L.price||m('product:price:amount')||m('og:price:amount')||'';
var cur=L.cur||m('product:price:currency')||m('og:price:currency')||'EUR';
var q='url='+encodeURIComponent(location.href)+
'&title='+encodeURIComponent(String(title).replace(/\\s+/g,' ').trim().slice(0,160))+
'&image='+encodeURIComponent(String(image).slice(0,1000))+
'&images='+encodeURIComponent(images.slice(0,5).join(' ').slice(0,1600))+
'&price='+encodeURIComponent(String(price).slice(0,20))+
'&currency='+encodeURIComponent(String(cur).slice(0,3));
var u='${origin}/add?'+q;
var w=window.open(u,'_blank');
if(!w)location.href=u;
})();`;

  // Alles op één regel, want een bladwijzer kan geen regeleindes bevatten.
  return `javascript:${encodeURIComponent(source.replace(/\n/g, ""))}`;
}
