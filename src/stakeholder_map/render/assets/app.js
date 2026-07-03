/* Lógica de interacción del mapa de stakeholders.
   Este archivo se incrusta tal cual en el HTML generado. Editarlo no exige
   tocar Python: vuelve a ejecutar la herramienta y el cambio se aplica. */
(function(){
'use strict';
var DATA=JSON.parse(document.getElementById('data').textContent||'{}');
var svg=document.getElementById('svg');
var details=document.getElementById('details');
var spokes=document.getElementById('focusSpokes');
var rings=document.getElementById('rings');
var ringLabels=document.getElementById('ringLabels');
var hint=document.getElementById('focusHint');
var NET_R=(DATA.net_r||34);
var IDX={}, NODE_EL={}, CHILDREN={}, DEG={}, SUPPORT={};
DATA.nodes.forEach(function(n){IDX[n.id]=n; if(n.parent_id){(CHILDREN[n.parent_id]=CHILDREN[n.parent_id]||[]).push(n);}});
DATA.edges.forEach(function(e){DEG[e.source]=(DEG[e.source]||0)+1;DEG[e.target]=(DEG[e.target]||0)+1;
  var s=e.pol==='pos'?1:(e.pol==='neg'?-1:0); SUPPORT[e.target]=(SUPPORT[e.target]||0)+s*(parseInt(e.strength,10)||0);});
var POLCOL={pos:'#2e9e5b',neg:'#d64545',neu:'#9aa3af'};
var ZONE={
  cm:{l:'Gestionar de cerca',a:'Involucrar de forma activa: co-decisión y comunicación frecuente.'},
  ks:{l:'Mantener satisfecho',a:'Mantener conforme: consultar en decisiones clave, sin saturar.'},
  ki:{l:'Mantener informado',a:'Informar y escuchar: aprovechar como aliado o vocero.'},
  mo:{l:'Monitorear',a:'Seguimiento ligero: reevaluar si cambia su poder o interés.'},
  no:{l:'Sin clasificar',a:'Falta poder o interés en los datos.'}
};
function isHigh(rank,n){return n>1?(rank>=(n-1)/2):(rank>=0);}
function classify(pr,ir){
  if(pr==null||pr<0||ir==null||ir<0){return ZONE.no;}
  var pH=isHigh(pr,DATA.NP||1), iH=isHigh(ir,DATA.NI||1);
  return pH&&iH?ZONE.cm:(pH&&!iH?ZONE.ks:(!pH&&iH?ZONE.ki:ZONE.mo));
}
function applyEdgeColors(){
  var el=document.getElementById('polColor'); var on=el&&el.checked;
  document.querySelectorAll('.edge').forEach(function(p){
    p.setAttribute('stroke', on?(POLCOL[p.getAttribute('data-pol')]||'#9aa3af'):(p.getAttribute('data-typecolor')||'#999'));});
}
window.togglePolColor=function(){applyEdgeColors();};
var tip=document.getElementById('tip');
var main=svg.parentNode;
var view={x:0,y:0,w:1600,h:1100}, drag=false, start=null, v0=null, quadrant=false, network=false, focused=null;
var DEFAULT_DETAILS='<div class="dtitle">Selecciona un stakeholder</div><p class="small">Click en un nodo para resaltar sus conexiones. Si es una entidad con subdivisiones, se abre su mapa local (interés = distancia, poder = tamaño).</p>';
function byId(id){return IDX[id];}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function vw(){return svg.clientWidth||(svg.getBoundingClientRect&&svg.getBoundingClientRect().width)||1600;}
var lastVW=-1;
function updateLabels(){
  if(view.w===lastVW){return;} lastVW=view.w;
  var ppu=vw()/view.w; if(!isFinite(ppu)||ppu<=0){ppu=1600/view.w;}
  document.querySelectorAll('.node').forEach(function(g){if(g){g.classList.toggle('nolbl',(curR(g)*ppu)<9);}});
}
function setView(){svg.setAttribute('viewBox',view.x+' '+view.y+' '+view.w+' '+view.h);updateLabels();}
function showTip(html,e){if(!tip){return;}tip.innerHTML=html;tip.classList.remove('hidden');moveTip(e);}
function moveTip(e){if(!tip){return;}var r=main.getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';}
function hideTip(){if(tip){tip.classList.add('hidden');}}
function flash(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;main.appendChild(t);setTimeout(function(){if(t.parentNode){t.parentNode.removeChild(t);}},1700);}
window.zoomBy=function(f,cx,cy){cx=(cx===undefined)?800:cx;cy=(cy===undefined)?550:cy;var nw=view.w/f,nh=view.h/f;view.x=cx-(cx-view.x)*(nw/view.w);view.y=cy-(cy-view.y)*(nh/view.h);view.w=nw;view.h=nh;setView();};
window.resetView=function(){view={x:0,y:0,w:1600,h:1100};setView();};
function svgPoint(e){var r=svg.getBoundingClientRect();return {x:view.x+(e.clientX-r.left)/r.width*view.w,y:view.y+(e.clientY-r.top)/r.height*view.h};}
svg.addEventListener('wheel',function(e){e.preventDefault();var p=svgPoint(e);window.zoomBy(e.deltaY<0?1.15:0.87,p.x,p.y);},{passive:false});
svg.addEventListener('mousedown',function(e){drag=true;start={x:e.clientX,y:e.clientY};v0={x:view.x,y:view.y,w:view.w,h:view.h};});
window.addEventListener('mousemove',function(e){if(!drag){return;}view.x=v0.x-(e.clientX-start.x)*(view.w/svg.clientWidth);view.y=v0.y-(e.clientY-start.y)*(view.h/svg.clientHeight);setView();});
window.addEventListener('mouseup',function(){drag=false;});

var spread=1, subsOff=false, lens='', prevLens='', prevMode='r';
function rawPos(g){var id=g.getAttribute('data-id');var nd=IDX[id];
  if(lens&&nd&&nd.tpos&&nd.tpos[lens]){return {x:nd.tpos[lens].x,y:nd.tpos[lens].y};}
  if(subsOff){return {x:parseFloat(g.getAttribute('data-ex')),y:parseFloat(g.getAttribute('data-ey'))};}
  return {x:parseFloat(g.getAttribute('data-x')),y:parseFloat(g.getAttribute('data-y'))};}
function netPos(g){var p=rawPos(g);return {x:800+(p.x-800)*spread,y:550+(p.y-550)*spread};}
function nodePos(g){
  var nd=IDX[g.getAttribute('data-id')];
  if(network){return {x:800+((nd?nd.nx:800)-800)*spread,y:550+((nd?nd.ny:550)-550)*spread};}
  if(quadrant){
    if(lens&&nd&&nd.tquad&&nd.tquad[lens]){return {x:nd.tquad[lens].qx,y:nd.tquad[lens].qy};}
    return {x:parseFloat(g.getAttribute('data-qx')),y:parseFloat(g.getAttribute('data-qy'))};}
  return netPos(g);}
function curR(g){var nd=IDX[g.getAttribute('data-id')];
  if(network){return NET_R*spread;}
  if(lens&&nd&&nd.tpos&&nd.tpos[lens]){return nd.tpos[lens].r;}
  return nd?nd.r:14;}
function resetPositions(){document.querySelectorAll('.node').forEach(function(g){
  var p=nodePos(g);g.setAttribute('transform','translate('+p.x+','+p.y+')');
  var nd=IDX[g.getAttribute('data-id')];var r=curR(g);var base=(nd&&nd.r)?nd.r:r;
  var c=g.querySelector('circle');if(c){c.setAttribute('r',r);}
  var mk=g.querySelector('.marker2');if(mk){mk.setAttribute('r',Math.max(4,r-5));}
  var lb=g.querySelector('.lbl');if(lb){lb.setAttribute('transform','scale('+(r/base).toFixed(3)+')');}
});}
function scaledOf(id){var g=NODE_EL[id];if(!g){return null;}if(network){var nd=IDX[id];return {x:800+((nd?nd.nx:800)-800)*spread,y:550+((nd?nd.ny:550)-550)*spread};}return netPos(g);}
function curPos(g){var m=/translate\(([-\d.]+) *,? *([-\d.]+)\)/.exec(g.getAttribute('transform')||'');return m?{x:parseFloat(m[1]),y:parseFloat(m[2])}:nodePos(g);}
function edgePath(a,b,off){var dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ln=Math.hypot(dx,dy)||1,nx=-dy/ln,ny=dx/ln;return 'M '+a.x+' '+a.y+' Q '+(mx+nx*(40+off))+' '+(my+ny*(40+off))+' '+b.x+' '+b.y;}
function drawEdges(){document.querySelectorAll('.edge').forEach(function(p){var a=scaledOf(p.getAttribute('data-source')),b=scaledOf(p.getAttribute('data-target'));if(!a||!b){return;}var off=parseFloat(p.getAttribute('data-curv'))||0;p.setAttribute('d',edgePath(a,b,off));});}
function scaleRings(){document.querySelectorAll('#rings circle').forEach(function(c){var r=parseFloat(c.getAttribute('data-r'));if(r){c.setAttribute('r',r*spread);}});document.querySelectorAll('#ringLabels text').forEach(function(t){var r=parseFloat(t.getAttribute('data-r'));if(r){t.setAttribute('y',550-r*spread-8);}});}
function fitAll(){var bb=visBBox(),pad=70,cx=bb.x+bb.w/2,cy=bb.y+bb.h/2,w=bb.w+pad*2,h=bb.h+pad*2,sc=Math.max(w/1600,h/1100,0.1);w=1600*sc;h=1100*sc;view={x:cx-w/2,y:cy-h/2,w:w,h:h};setView();}
window.setSpread=function(v){spread=parseFloat(v)||1;var sv=document.getElementById('spreadVal');if(sv){sv.textContent=spread.toFixed(2)+'\u00d7';}if(focused){releaseFocus();}if(quadrant){return;}resetPositions();scaleRings();drawEdges();fitAll();};

window.filters=function(){
  if(focused){return;}
  var cat=document.getElementById('catF').value, src=document.getElementById('srcF').value, typ=document.getElementById('typF').value;
  var showR=document.getElementById('showRings').checked, showS=document.getElementById('showSub').checked, showE=document.getElementById('showEdges').checked;
  lens = src || '';
  var curMode = quadrant?'q':(network?'n':'r');
  rings.classList.toggle('hidden', quadrant||network||!showR); ringLabels.classList.toggle('hidden', quadrant||network||!showR);
  document.querySelectorAll('.node').forEach(function(g){
    var nd=IDX[g.getAttribute('data-id')];
    var isSub=(g.getAttribute('data-level')||'').toLowerCase()==='subdivisi\u00f3n';
    var catOk=!cat||g.getAttribute('data-category')===cat;
    var themeOk=!src||(nd&&nd.tpos&&nd.tpos[src]);
    g.classList.toggle('hidden',!(catOk&&themeOk&&(!isSub||showS)));});
  document.querySelectorAll('.edge').forEach(function(e){
    var ge=NODE_EL[e.getAttribute('data-source')], gt=NODE_EL[e.getAttribute('data-target')];
    var typeOk=!typ||findEdge(e)===typ;
    var ok=!quadrant&&showE&&typeOk&&ge&&gt&&!ge.classList.contains('hidden')&&!gt.classList.contains('hidden');
    e.classList.toggle('hidden',!ok);});
  var so=!showS;
  var changed=(curMode!==prevMode)||(lens!==prevLens)||(so!==subsOff);
  subsOff=so; prevLens=lens; prevMode=curMode;
  resetPositions(); scaleRings();
  if(!quadrant && changed){ fitAll(); }
  drawEdges();
};
function findEdge(el){var s=el.getAttribute('data-source'),t=el.getAttribute('data-target');for(var i=0;i<DATA.edges.length;i++){if(DATA.edges[i].source===s&&DATA.edges[i].target===t){return DATA.edges[i].type;}}return '';}

// ---- Foco en una entidad: sus subdivisiones forman un mapa local poder-interés ----
function localR(kid){
  var ir=kid.ir, n=DATA.NI||1;
  if(ir==null||ir<0||n<=1){return 200;}
  return 240-(240-110)*(ir/(n-1));
}
function focusEntity(id){
  var kids=CHILDREN[id]; if(!kids||!kids.length){return false;}
  var p=IDX[id];
  rings.classList.add('hidden'); ringLabels.classList.add('hidden');
  document.querySelectorAll('.edge').forEach(function(e){e.classList.add('hidden');});
  var keep={}; keep[id]=1; kids.forEach(function(k){keep[k.id]=1;});
  document.querySelectorAll('.node').forEach(function(g){
    var gid=g.getAttribute('data-id'); var on=!!keep[gid];
    g.classList.toggle('hidden',!on); g.classList.remove('dim','direct','selected');});
  while(spokes.firstChild){spokes.removeChild(spokes.firstChild);}
  var pe=NODE_EL[id]; pe.classList.add('selected'); pe.setAttribute('transform','translate('+p.x+','+p.y+')');
  var byBand={}; kids.forEach(function(k){var b=k.interest||'';(byBand[b]=byBand[b]||[]).push(k);});
  var minx=p.x,maxx=p.x,miny=p.y,maxy=p.y;
  Object.keys(byBand).forEach(function(b){
    var arr=byBand[b], R=localR(arr[0]);
    arr.forEach(function(k,i){
      var a=2*Math.PI*i/arr.length - Math.PI/2 + Math.PI/arr.length;
      var x=p.x+R*Math.cos(a), y=p.y+R*Math.sin(a);
      var el=NODE_EL[k.id]; el.classList.add('direct'); el.setAttribute('transform','translate('+x+','+y+')');
      var ln=document.createElementNS('http://www.w3.org/2000/svg','line');
      ln.setAttribute('x1',p.x);ln.setAttribute('y1',p.y);ln.setAttribute('x2',x);ln.setAttribute('y2',y);ln.setAttribute('class','spoke');
      spokes.appendChild(ln);
      minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
    });
  });
  var pad=150, bw=(maxx-minx)+pad*2, bh=(maxy-miny)+pad*2, sc=Math.max(bw/1600,bh/1100,0.25);
  bw=1600*sc; bh=1100*sc;
  view={x:(minx+maxx)/2-bw/2, y:(miny+maxy)/2-bh/2, w:bw, h:bh}; setView();
  hint.textContent='Mapa local: '+p.label+'  \u00b7  click en el fondo para volver';
  hint.classList.remove('hidden');
  return true;
}
function releaseFocus(){
  focused=null;
  while(spokes.firstChild){spokes.removeChild(spokes.firstChild);}
  hint.classList.add('hidden');
  document.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight');});
  resetPositions(); scaleRings(); drawEdges(); window.filters(); window.resetView();
}

window.setMode=function(m){
  if(focused){releaseFocus();}
  network=(m==='network'); quadrant=(m==='quadrant');
  var qb=document.getElementById('qbtn'); if(qb){qb.textContent=quadrant?'Vista red':'Vista cuadrante';}
  document.querySelectorAll('.viewbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-mode')===m);});
  document.getElementById('qgrid').classList.toggle('hidden',!quadrant);
  document.querySelectorAll('.node').forEach(function(g){g.classList.remove('dim','selected','direct');});
  document.querySelectorAll('.edge').forEach(function(e){e.classList.remove('dim','highlight');});
  window.filters();
  if(quadrant){window.resetView();}
};
window.toggleQuadrant=function(){window.setMode(quadrant?'radial':'quadrant');};

function highlight(id){
  var related={}; related[id]=true;
  DATA.edges.forEach(function(e){if(e.source===id){related[e.target]=true;}if(e.target===id){related[e.source]=true;}});
  document.querySelectorAll('.node').forEach(function(g){var gid=g.getAttribute('data-id');var on=!!related[gid];g.classList.toggle('dim',!on);g.classList.toggle('selected',gid===id);g.classList.toggle('direct',on&&gid!==id);});
  document.querySelectorAll('.edge').forEach(function(e){var on=e.getAttribute('data-source')===id||e.getAttribute('data-target')===id;e.classList.toggle('dim',!on);e.classList.toggle('highlight',on);});
}
function selectNode(id){
  if(focused){
    if(id===focused){releaseFocus();details.innerHTML=DEFAULT_DETAILS;return;}
    var kf=CHILDREN[focused]||[];
    if(kf.some(function(k){return k.id===id;})){var c=curPos(NODE_EL[id]);window.zoomBy(1.35,c.x,c.y);showInfo(id);return;}
    releaseFocus();
  }
  if(!quadrant && !network && CHILDREN[id] && CHILDREN[id].length){focused=id;focusEntity(id);showInfo(id);return;}
  highlight(id);
  var n=byId(id); if(n){var cp=curPos(NODE_EL[id]); window.zoomBy(1.25, cp.x, cp.y);}
  showInfo(id);
}
function relList(arr,arrow,getOther){
  if(!arr.length){return '<p class="small">Sin relaciones</p>';}
  return '<ul class="rellist">'+arr.map(function(e){var o=getOther(e)||{};return '<li><span class="ra">'+arrow+'</span><span class="rn">'+escHtml(o.label)+'</span><span class="rm">'+escHtml(e.type)+' \u00b7 fuerza '+escHtml(e.strength)+'</span></li>';}).join('')+'</ul>';
}
function showInfo(id){
  var n=byId(id);if(!n){return;}
  var out=DATA.edges.filter(function(e){return e.source===id;});
  var inc=DATA.edges.filter(function(e){return e.target===id;});
  var kids=CHILDREN[id]||[];
  var ei=n.interest, ep=n.power, eir=n.ir, epr=n.pr, lensTag='';
  if(lens){var te=(n.themes||[]).filter(function(t){return t.theme===lens;})[0];
    if(te){ei=te.interest;ep=te.power;eir=te.ir;epr=te.pr;lensTag=' \u00b7 tema '+escHtml(lens);}}
  var h='<div class="dtitle">'+escHtml(n.label)+'</div>';
  h+='<div class="pills"><span class="pill">'+escHtml(n.level||'\u2014')+'</span><span class="pill">'+escHtml(n.category||'\u2014')+'</span></div>';
  h+='<div class="statgrid"><b>Fuente / tema</b><span>'+escHtml(lens?lens:(n.source||'\u2014'))+'</span>'
    +'<b>Inter\u00e9s'+(lens?lensTag:'')+'</b><span>'+escHtml(ei||'\u2014')+'</span>'
    +'<b>Poder'+(lens?lensTag:'')+'</b><span>'+escHtml(ep||'\u2014')+'</span>'
    +'<b>Conexiones</b><span>'+(DEG[id]||0)+'</span>'
    +'<b>Apoyo (entrante)</b><span>'+((SUPPORT[id]||0)>0?'+':'')+(SUPPORT[id]||0)+'</span>'
    +'<b>Posici\u00f3n</b><span>'+Math.round(n.x)+', '+Math.round(n.y)+'</span></div>';
  var z=classify(epr,eir);
  h+='<div class="note"><b>'+z.l+'</b>'+(lens?' <span class="small">(seg\u00fan tema '+escHtml(lens)+')</span>':'')+'<br>'+z.a+'</div>';
  if(n.themes&&n.themes.length>1){
    h+='<div class="hkey" style="margin-top:8px">Por tema (inter\u00e9s \u00b7 poder)</div><div class="statgrid">'
      +n.themes.map(function(t){return '<b>'+escHtml(t.theme||'\u2014')+'</b><span>'+escHtml(t.interest||'\u2014')+' \u00b7 '+escHtml(t.power||'\u2014')+'</span>';}).join('')
      +'</div>';
  }
  if(n.description){h+='<p class="dtext">'+escHtml(n.description)+'</p>';}
  if(n.notes){h+='<p class="small"><b>Notas:</b> '+escHtml(n.notes)+'</p>';}
  if(kids.length){h+='<div class="note">'+kids.length+' subdivisi\u00f3n(es). Click en la entidad abre su mapa local: distancia = inter\u00e9s propio, tama\u00f1o = poder propio.</div>';}
  h+='<h4>Relaciones salientes ('+out.length+')</h4>'+relList(out,'\u2192',function(e){return byId(e.target);});
  h+='<h4>Relaciones entrantes ('+inc.length+')</h4>'+relList(inc,'\u2190',function(e){return byId(e.source);});
  details.innerHTML=h; openRight();
}
function clearSel(){
  if(focused){releaseFocus();details.innerHTML=DEFAULT_DETAILS;closeRight();return;}
  document.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight');});
  details.innerHTML=DEFAULT_DETAILS; closeRight(); if(!quadrant){window.filters();}
}
svg.addEventListener('click',clearSel);
document.querySelectorAll('.node').forEach(function(g){
  var id=g.getAttribute('data-id'); NODE_EL[id]=g;
  g.addEventListener('click',function(e){e.stopPropagation();selectNode(id);});
  g.addEventListener('mouseenter',function(e){var n=IDX[id];if(!n){return;}showTip('<b>'+escHtml(n.label)+'</b>Inter\u00e9s: '+escHtml(n.interest||'\u2014')+' \u00b7 Poder: '+escHtml(n.power||'\u2014')+'<br>Conexiones: '+(DEG[id]||0),e);});
  g.addEventListener('mousemove',moveTip);
  g.addEventListener('mouseleave',hideTip);
});
document.querySelectorAll('.edge').forEach(function(p){
  p.addEventListener('mouseenter',function(e){var s=p.getAttribute('data-source'),t=p.getAttribute('data-target'),ed=null;for(var i=0;i<DATA.edges.length;i++){if(DATA.edges[i].source===s&&DATA.edges[i].target===t){ed=DATA.edges[i];break;}}if(!ed){return;}var sn=IDX[s]||{},tn=IDX[t]||{};showTip('<b>'+escHtml(ed.type||'Relaci\u00f3n')+'</b>'+escHtml(sn.label)+' \u2192 '+escHtml(tn.label)+'<br>Fuerza: '+escHtml(ed.strength),e);});
  p.addEventListener('mousemove',moveTip);
  p.addEventListener('mouseleave',hideTip);
});

window.searchNode=function(){var q=(document.getElementById('search').value||'').toLowerCase();if(!q){clearSel();return;}for(var i=0;i<DATA.nodes.length;i++){if(String(DATA.nodes[i].label).toLowerCase().indexOf(q)>=0){selectNode(DATA.nodes[i].id);return;}}};
window.toggleRight=function(){document.getElementById('app').classList.toggle('hideRight');document.getElementById('right').classList.toggle('rightHidden');};

window.filterCat=function(c){if(focused){releaseFocus();}var s=document.getElementById('catF');if(s.value===c){c='';}s.value=c;window.filters();};
window.filterType=function(t){if(focused){releaseFocus();}var s=document.getElementById('typF');if(s.value===t){t='';}s.value=t;window.filters();};
window.filterSrc=function(v){if(focused){releaseFocus();}var s=document.getElementById('srcF');if(s.value===v){v='';}s.value=v;window.filters();};
function openRight(){document.getElementById('app').classList.remove('hideRight');document.getElementById('right').classList.remove('rightHidden');}
window.closeRight=function(){document.getElementById('app').classList.add('hideRight');document.getElementById('right').classList.add('rightHidden');};
function buildTop(){
  var arr=DATA.nodes.slice().sort(function(a,b){return (DEG[b.id]||0)-(DEG[a.id]||0);}).slice(0,6);
  var ul=document.getElementById('topList'); if(!ul){return;}
  ul.innerHTML=arr.map(function(n){return "<li data-id='"+escHtml(n.id)+"'><span>"+escHtml(n.label)+"</span><span class='d'>"+(DEG[n.id]||0)+"</span></li>";}).join('');
  ul.querySelectorAll('li').forEach(function(li){li.addEventListener('click',function(){selectNode(li.getAttribute('data-id'));});});
}

var EXPORT_CSS=".ring{fill:none;stroke:#d6dbe3;stroke-dasharray:6 6}.ringlab{fill:#8a93a0;font-weight:600;font-size:13px;paint-order:stroke;stroke:#ffffff;stroke-width:4px}.spoke{stroke:#aab2bf;stroke-width:1.5;stroke-dasharray:3 4}.edge{fill:none;opacity:.5}.node circle{stroke-width:3px}.node text{font-family:Arial,Segoe UI,sans-serif;font-weight:600}.hidden{display:none}.qline{stroke:#c3cad6;stroke-width:1.5}.qlab{font-size:13px;fill:#5b6675;font-weight:700}.qtick{font-size:13px;fill:#39424f;font-weight:700}.qaxis{font-size:14px;fill:#39424f;font-weight:700}";
function visBBox(){
  var minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9,any=false;
  document.querySelectorAll('.node').forEach(function(g){
    if(g.classList.contains('hidden')){return;}
    var n=IDX[g.getAttribute('data-id')]; if(!n){return;} var p=curPos(g); var rr=curR(g);
    any=true; minx=Math.min(minx,p.x-rr);maxx=Math.max(maxx,p.x+rr);miny=Math.min(miny,p.y-rr);maxy=Math.max(maxy,p.y+rr);
  });
  if(!any){return {x:0,y:0,w:1600,h:1100};}
  return {x:minx,y:miny,w:maxx-minx,h:maxy-miny};
}
function buildExportSVG(){
  var bb=visBBox(), pad=70, titleH=66;
  var vis={}; document.querySelectorAll('.node').forEach(function(g){if(!g.classList.contains('hidden')){var n=IDX[g.getAttribute('data-id')];if(n&&n.category){vis[n.category]=n.fill;}}});
  var cats=vis; var catList=Object.keys(cats).sort(), perRow=3, lrows=Math.max(1,Math.ceil(catList.length/perRow));
  var legendH=34+lrows*24+18;
  var W=bb.w+pad*2, H=bb.h+pad*2+titleH+legendH, vbx=bb.x-pad, vby=bb.y-pad-titleH;
  var clone=svg.cloneNode(true);
  clone.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight','nolbl');});
  var inner=clone.innerHTML;
  var mode=quadrant?'cuadrante (poder\u2013inter\u00e9s)':(network?'conexiones (red)':'poder\u2013inter\u00e9s');
  var lensTag=lens?(' \u00b7 tema: '+lens):' \u00b7 consolidado';
  var title="<text x='"+(bb.x+bb.w/2)+"' y='"+(bb.y-pad-titleH/2+8)+"' text-anchor='middle' font-size='26' font-weight='700' fill='#1f2733'>Mapa de Stakeholders \u00b7 Vista "+mode+lensTag+"</text>";
  var ly=bb.y+bb.h+pad+26;
  var key=quadrant?'Cuadrante de Mendelow  \u00b7  tama\u00f1o = poder  \u00b7  ejes: inter\u00e9s (x) y poder (y)':(network?'Distribuci\u00f3n por relaciones (systems thinking)  \u00b7  tama\u00f1o uniforme  \u00b7  borde = tema':'tama\u00f1o = poder  \u00b7  distancia al centro = inter\u00e9s  \u00b7  borde = tema');
  if(lens){key+='  \u00b7  valores del tema '+lens;}
  var leg="<text x='"+bb.x+"' y='"+(ly-8)+"' font-size='15' font-weight='700' fill='#39424f'>Categor\u00edas  \u00b7  "+escHtml(key)+"</text>";
  catList.forEach(function(c,i){
    var col=i%perRow,row=Math.floor(i/perRow),lx=bb.x+col*(bb.w/perRow),lyy=ly+16+row*24;
    leg+="<rect x='"+lx+"' y='"+(lyy-12)+"' width='15' height='15' rx='3' fill='"+cats[c]+"' stroke='#99a'/>";
    leg+="<text x='"+(lx+22)+"' y='"+lyy+"' font-size='13' fill='#1f2733'>"+escHtml(c)+"</text>";
  });
  return "<svg xmlns='http://www.w3.org/2000/svg' width='"+Math.round(W)+"' height='"+Math.round(H)+"' viewBox='"+vbx+" "+vby+" "+W+" "+H+"' font-family='Arial,Segoe UI,sans-serif'><style>"+EXPORT_CSS+"</style><rect x='"+vbx+"' y='"+vby+"' width='"+W+"' height='"+H+"' fill='#ffffff'/>"+title+inner+leg+"</svg>";
}
window.buildExportSVG=buildExportSVG;
function rasterize(){return new Promise(function(res,rej){
  var s=buildExportSVG(), blob=new Blob([s],{type:'image/svg+xml;charset=utf-8'}), url=URL.createObjectURL(blob), img=new Image();
  img.onload=function(){var sc=2,c=document.createElement('canvas');c.width=Math.max(1,img.width*sc);c.height=Math.max(1,img.height*sc);var ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c);};
  img.onerror=function(){URL.revokeObjectURL(url);rej(new Error('img'));};
  img.src=url;
});}
window.exportPNG=function(){rasterize().then(function(c){c.toBlob(function(b){if(!b){flash('No se pudo generar el PNG; usa SVG.');return;}var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='stakeholder_map.png';a.click();setTimeout(function(){URL.revokeObjectURL(u);},1000);});}).catch(function(){flash('No se pudo generar el PNG; usa el bot\u00f3n SVG.');});};
window.copyImage=function(){if(!navigator.clipboard||!window.ClipboardItem){flash('Copiar no disponible aqu\u00ed; descargando PNG.');window.exportPNG();return;}rasterize().then(function(c){c.toBlob(function(b){if(!b){window.exportPNG();return;}navigator.clipboard.write([new window.ClipboardItem({'image/png':b})]).then(function(){flash('Imagen copiada al portapapeles');}).catch(function(){flash('No se pudo copiar; descargando PNG.');window.exportPNG();});});}).catch(function(){window.exportPNG();});};

function csv(v){return '"'+String(v===undefined?'':v).replace(/"/g,'""')+'"';}
function download(name,rows){if(!rows.length){return;}var hd=Object.keys(rows[0]);var txt=[hd.join(',')].concat(rows.map(function(r){return hd.map(function(k){return csv(r[k]);}).join(',');})).join('\n');var b=new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download=name;a.click();}
window.downloadNodes=function(){download('stakeholder_nodes_coordinates.csv',DATA.nodes);};
window.downloadEdges=function(){download('stakeholder_edges.csv',DATA.edges);};
window.downloadStrategy=function(){
  var rows=DATA.nodes.map(function(n){var z=classify(n.pr,n.ir);return {
    id:n.id, nombre:n.label, categoria:n.category, fuente_tema:n.source, nivel:n.level,
    poder:n.power, interes:n.interest, conexiones:(DEG[n.id]||0), apoyo_entrante:(SUPPORT[n.id]||0),
    clasificacion:z.l, accion_sugerida:z.a};});
  download('stakeholder_estrategia.csv',rows);
};
window.downloadSVG=function(){var b=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='stakeholder_map.svg';a.click();};

details.innerHTML=DEFAULT_DETAILS; buildTop(); applyEdgeColors(); window.filters(); fitAll();
})();
