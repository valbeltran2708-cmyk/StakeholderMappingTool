/* Lógica de interacción del mapa de stakeholders.
   Este archivo se incrusta tal cual en el HTML generado. Editarlo no exige
   tocar Python: vuelve a ejecutar la herramienta y el cambio se aplica.

   Motor de layout dinámico: cada vez que cambian los filtros (categoría,
   tema, subdivisiones) o la vista, las posiciones se recalculan SOLO con
   los nodos visibles, así los círculos se reordenan sin dejar huecos y
   sin solaparse:
   - Radial: separación tangencial + resorte fuerte hacia la banda de
     interés (la distancia al centro se mantiene fiel al eje).
   - Cuadrante: círculos de tamaño uniforme empaquetados en rejilla dentro
     de cada celda (la posición ya codifica interés y poder).
   - Conexiones: parte de la posición force-directed precalculada y separa
     colisiones del subconjunto visible. */
(function(){
'use strict';
var DATA=JSON.parse(document.getElementById('data').textContent||'{}');
var GEO=DATA.geo||{R_IN:150,R_OUT:470,S_MIN:26,S_MAX:56,QMX:190,QMY:130,QRMAX:40,QRMIN:14};
var svg=document.getElementById('svg');
var details=document.getElementById('details');
var spokes=document.getElementById('focusSpokes');
var rings=document.getElementById('rings');
var ringLabels=document.getElementById('ringLabels');
var hint=document.getElementById('focusHint');
var NI=DATA.NI||1, NP=DATA.NP||1;
var IDX={}, NODE_EL={}, CHILDREN={}, DEG={}, SUPPORT={}, LPOS={};
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
  var pH=isHigh(pr,NP), iH=isHigh(ir,NI);
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
var spread=1, lens='', multiOnly=false, lastKey='';
var DEFAULT_DETAILS='<div class="dtitle">Selecciona un stakeholder</div><p class="small">Click en un nodo para resaltar sus conexiones. Si es una entidad con subdivisiones, se abre su mapa local (interés = distancia, poder = tamaño).</p>';
function byId(id){return IDX[id];}
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

/* ---------------- motor de layout ---------------- */
function lensVals(n){
  if(lens&&n.themes){for(var i=0;i<n.themes.length;i++){if(n.themes[i].theme===lens){return n.themes[i];}}}
  return n;
}
function sizeFor(pr){
  if(pr==null||pr<0){return GEO.S_MIN-2;}
  if(NP<=1){return Math.round((GEO.S_MIN+GEO.S_MAX)/2);}
  return Math.round(GEO.S_MIN+(GEO.S_MAX-GEO.S_MIN)*(pr/(NP-1)));
}
function radiusFor(ir){
  if(ir==null||ir<0){return GEO.R_OUT+30;}
  if(NI<=1){return (GEO.R_IN+GEO.R_OUT)/2;}
  return GEO.R_OUT-(GEO.R_OUT-GEO.R_IN)*(ir/(NI-1));
}
function visIds(){
  var out=[];
  for(var id in NODE_EL){if(!NODE_EL[id].classList.contains('hidden')){out.push(id);}}
  return out;
}
function layoutRadial(ids){
  var P={}, R={}, T={}, SA={};
  // Sectores por esfera: arco proporcional al nº de nodos VISIBLES de cada
  // una (con un piso para que las esferas pequeñas no queden en una astilla).
  var byCat={};
  ids.forEach(function(id){var c=IDX[id].category||'\u2014';(byCat[c]=byCat[c]||[]).push(id);});
  var cats=Object.keys(byCat).sort();
  var Nt=ids.length||1, K=cats.length||1;
  var floorA=Math.min(0.35,(2*Math.PI/K)*0.5);
  var spans=cats.map(function(c){return Math.max(2*Math.PI*byCat[c].length/Nt, floorA);});
  var ssum=spans.reduce(function(a,b){return a+b;},0)||1;
  spans=spans.map(function(sp){return sp*2*Math.PI/ssum;});
  var acc=-Math.PI/2;
  cats.forEach(function(c,ci){
    var a1=acc+spans[ci];
    var arr=byCat[c].slice().sort(function(x,y){
      var lx=lensVals(IDX[x]), ly=lensVals(IDX[y]);
      return (ly.ir-lx.ir)||String(IDX[x].label).localeCompare(String(IDX[y].label));});
    arr.forEach(function(id,i2){
      var lv=lensVals(IDX[id]);
      var t=radiusFor(lv.ir); T[id]=t; R[id]=sizeFor(lv.pr); SA[id]=[acc,a1];
      var a=acc+spans[ci]*(i2+0.5)/arr.length;
      P[id]={x:800+t*Math.cos(a),y:550+t*Math.sin(a)};
    });
    acc=a1;
  });
  function clampAng(id,p){
    var sec=SA[id]; if(!sec){return;}
    var vx=p.x-800, vy=p.y-550, d=Math.hypot(vx,vy)||0.01;
    var a=Math.atan2(vy,vx);
    while(a<sec[0]){a+=2*Math.PI;}
    while(a>=sec[0]+2*Math.PI){a-=2*Math.PI;}
    var half=(sec[1]-sec[0])/2;
    var m=Math.min(half*0.92,(R[id]+4)/Math.max(d,R[id]+4));
    var lo=sec[0]+m, hi=sec[1]-m;
    if(lo>hi){lo=hi=(sec[0]+sec[1])/2;}
    var na=Math.min(hi,Math.max(lo,a));
    if(na!==a){p.x=800+d*Math.cos(na); p.y=550+d*Math.sin(na);}
  }
  var iters=ids.length<=140?150:90;
  for(var it=0;it<iters;it++){
    var moved=false;
    for(var i=0;i<ids.length;i++){
      var a=P[ids[i]];
      for(var j=i+1;j<ids.length;j++){
        var b=P[ids[j]];
        var dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.01;
        var mind=R[ids[i]]+R[ids[j]]+10;
        if(d<mind){
          var push=(mind-d)/2, ux=dx/d, uy=dy/d;
          [[a,-1],[b,1]].forEach(function(ps){
            var p=ps[0], sg=ps[1];
            var rx=p.x-800, ry=p.y-550, rd=Math.hypot(rx,ry)||0.01;
            var rux=rx/rd, ruy=ry/rd, dot=ux*rux+uy*ruy;
            p.x+=sg*(ux-dot*rux*0.65)*push;
            p.y+=sg*(uy-dot*ruy*0.65)*push;
          });
          moved=true;
        }
      }
    }
    for(var k=0;k<ids.length;k++){
      var p=P[ids[k]];
      var vx=p.x-800, vy=p.y-550, d2=Math.hypot(vx,vy)||0.01;
      var corr=(T[ids[k]]-d2)*0.35;
      p.x+=vx/d2*corr; p.y+=vy/d2*corr;
      clampAng(ids[k],p);
      p.x=Math.min(1560,Math.max(40,p.x)); p.y=Math.min(1060,Math.max(40,p.y));
    }
    if(!moved){break;}
  }
  // Fase 2: separación pura garantizada. Cuando un sector o banda está
  // sobrepoblado es imposible mantener a todos dentro sin solaparse; aquí
  // se deja que los sobrantes se desvíen lo mínimo. Si aun así no converge,
  // se reducen los radios y se repite hasta garantizar cero solapes.
  function pureSep(pad){
    for(var it2=0;it2<160;it2++){
      var mv=false;
      for(var i2=0;i2<ids.length;i2++){
        var a2=P[ids[i2]];
        for(var j2=i2+1;j2<ids.length;j2++){
          var b2=P[ids[j2]];
          var dx2=b2.x-a2.x, dy2=b2.y-a2.y, dd=Math.hypot(dx2,dy2)||0.01;
          var md=R[ids[i2]]+R[ids[j2]]+pad;
          if(dd<md){
            var ph=(md-dd)/2, ux2=dx2/dd, uy2=dy2/dd;
            a2.x-=ux2*ph;a2.y-=uy2*ph;b2.x+=ux2*ph;b2.y+=uy2*ph;mv=true;
          }
        }
      }
      for(var k2=0;k2<ids.length;k2++){
        var p2=P[ids[k2]];
        p2.x=Math.min(1560,Math.max(40,p2.x)); p2.y=Math.min(1060,Math.max(40,p2.y));
      }
      if(!mv){return true;}
    }
    for(var i3=0;i3<ids.length;i3++){
      for(var j3=i3+1;j3<ids.length;j3++){
        var a3=P[ids[i3]], b3=P[ids[j3]];
        if(Math.hypot(a3.x-b3.x,a3.y-b3.y)<R[ids[i3]]+R[ids[j3]]+1){return false;}
      }
    }
    return true;
  }
  for(var pass=0; pass<4 && !pureSep(6); pass++){
    ids.forEach(function(id){R[id]=Math.max(10,R[id]*0.9);});
  }
  ids.forEach(function(id){LPOS[id]={x:P[id].x,y:P[id].y,r:Math.round(R[id])};});
}
function layoutQuad(ids){
  var mx=GEO.QMX,my=GEO.QMY,ncol=Math.max(NI,1),nrow=Math.max(NP,1);
  var gw=(1600-2*mx)/ncol, gh=(1100-2*my)/nrow;
  var pad=Math.min(20,gw*0.07,gh*0.07), uw=gw-2*pad, uh=gh-2*pad;
  var cells={};
  ids.forEach(function(id){
    var lv=lensVals(IDX[id]);
    var c=(lv.ir==null||lv.ir<0)?0:Math.min(ncol-1,Math.max(0,Math.round(lv.ir)));
    var pr=(lv.pr==null||lv.pr<0)?0:Math.min(nrow-1,Math.max(0,Math.round(lv.pr)));
    var key=c+'_'+((nrow-1)-pr);
    (cells[key]=cells[key]||[]).push(id);
  });
  var Q=GEO.QRMAX;
  Object.keys(cells).forEach(function(key){
    var g=cells[key].length, k=Math.ceil(Math.sqrt(g)), rows=Math.ceil(g/k);
    Q=Math.min(Q, Math.min(uw/k, uh/rows)/2-4);
  });
  Q=Math.max(8, Math.min(GEO.QRMAX, Math.round(Q)));
  Object.keys(cells).forEach(function(key){
    var arr=cells[key], g=arr.length, k=Math.ceil(Math.sqrt(g)), rows=Math.ceil(g/k);
    var parts=key.split('_'), c=+parts[0], row=+parts[1];
    var cx=mx+(c+0.5)*gw, cy=my+(row+0.5)*gh;
    var sx=Math.min(2*Q+12, k>1?uw/(k-1):uw);
    var sy=Math.min(2*Q+12, rows>1?uh/(rows-1):uh);
    arr.forEach(function(id,idx){
      var gx=idx%k, gy=Math.floor(idx/k);
      var inRow=(gy===rows-1)?(g-(rows-1)*k):k;   // última fila centrada
      LPOS[id]={x:cx+(gx-(inRow-1)/2)*sx, y:cy+(gy-(rows-1)/2)*sy, r:Q};
    });
  });
}
function layoutNet(ids){
  var m=90, avail=(1600-2*m)*(1100-2*m), n=Math.max(ids.length,1);
  var r=Math.round(Math.min(GEO.NRMAX||34, Math.max(GEO.NRMIN||12, (GEO.NFILL||0.36)*Math.sqrt(avail/n))));
  var P={};
  ids.forEach(function(id){var nd=IDX[id];P[id]={x:nd.nx||800,y:nd.ny||550};});
  function separate(rad){
    var mind=rad*2+6, iters=ids.length<=140?170:110;
    for(var it=0;it<iters;it++){
      var moved=false;
      for(var i=0;i<ids.length;i++){
        for(var j=i+1;j<ids.length;j++){
          var a=P[ids[i]], b=P[ids[j]];
          var dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy)||0.01;
          if(d<mind){
            var push=(mind-d)/2, ux=dx/d, uy=dy/d;
            a.x+=ux*push;a.y+=uy*push;b.x-=ux*push;b.y-=uy*push;moved=true;
          }
        }
      }
      ids.forEach(function(id){var p=P[id];p.x=Math.min(1540,Math.max(60,p.x));p.y=Math.min(1040,Math.max(60,p.y));});
      if(!moved){break;}
    }
    // verificación final: el clamp del último ciclo pudo reintroducir un roce
    for(var i2=0;i2<ids.length;i2++){
      for(var j2=i2+1;j2<ids.length;j2++){
        var a2=P[ids[i2]], b2=P[ids[j2]];
        if(Math.hypot(a2.x-b2.x,a2.y-b2.y) < rad*2+1){return false;}
      }
    }
    return true;
  }
  // si no converge con el radio adaptativo, se reduce hasta garantizar cero solapes
  for(var pass=0; pass<5 && !separate(r); pass++){
    r=Math.max(9, Math.round(r*0.9));
  }
  ids.forEach(function(id){LPOS[id]={x:P[id].x,y:P[id].y,r:r};});
}
function relayout(){
  LPOS={};
  var ids=visIds();
  if(network){layoutNet(ids);}
  else if(quadrant){layoutQuad(ids);}
  else{layoutRadial(ids);}
}
/* -------------------------------------------------- */

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

function nodePos(g){
  var id=g.getAttribute('data-id');
  var n=IDX[id], p=LPOS[id]||{x:(n?n.x:800),y:(n?n.y:550)};
  if(quadrant){return {x:p.x,y:p.y};}
  return {x:800+(p.x-800)*spread, y:550+(p.y-550)*spread};
}
function curR(g){
  var id=g.getAttribute('data-id'), n=IDX[id], p=LPOS[id];
  var r=p?p.r:(n?n.r:14);
  return network?r*spread:r;
}
function posOf(id){var g=NODE_EL[id];return g?nodePos(g):null;}
function resetPositions(){document.querySelectorAll('.node').forEach(function(g){
  var p=nodePos(g);g.setAttribute('transform','translate('+p.x+','+p.y+')');
  var nd=IDX[g.getAttribute('data-id')];var r=curR(g);var base=(nd&&nd.r)?nd.r:r;
  var c=g.querySelector('circle');if(c){c.setAttribute('r',r);}
  var mk=g.querySelector('.marker2');if(mk){mk.setAttribute('r',Math.max(4,r-5));}
  var lb=g.querySelector('.lbl');if(lb){lb.setAttribute('transform','scale('+(r/base).toFixed(3)+')');}
});}
function curPos(g){var m=/translate\(([-\d.]+) *,? *([-\d.]+)\)/.exec(g.getAttribute('transform')||'');return m?{x:parseFloat(m[1]),y:parseFloat(m[2])}:nodePos(g);}
function edgePath(a,b,off){var dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ln=Math.hypot(dx,dy)||1,nx=-dy/ln,ny=dx/ln;return 'M '+a.x+' '+a.y+' Q '+(mx+nx*(40+off))+' '+(my+ny*(40+off))+' '+b.x+' '+b.y;}
function drawEdges(){document.querySelectorAll('.edge').forEach(function(p){var a=posOf(p.getAttribute('data-source')),b=posOf(p.getAttribute('data-target'));if(!a||!b){return;}var off=parseFloat(p.getAttribute('data-curv'))||0;p.setAttribute('d',edgePath(a,b,off));});}
function scaleRings(){document.querySelectorAll('#rings circle').forEach(function(c){var r=parseFloat(c.getAttribute('data-r'));if(r){c.setAttribute('r',r*spread);}});document.querySelectorAll('#ringLabels text').forEach(function(t){var r=parseFloat(t.getAttribute('data-r'));if(r){t.setAttribute('y',550-r*spread-8);}});}
function fitAll(){var bb=visBBox(),pad=70,cx=bb.x+bb.w/2,cy=bb.y+bb.h/2,w=bb.w+pad*2,h=bb.h+pad*2,sc=Math.max(w/1600,h/1100,0.1);if(!quadrant&&!network){sc=Math.max(sc,0.55);}w=1600*sc;h=1100*sc;view={x:cx-w/2,y:cy-h/2,w:w,h:h};setView();}
window.setSpread=function(v){spread=parseFloat(v)||1;var sv=document.getElementById('spreadVal');if(sv){sv.textContent=spread.toFixed(2)+'\u00d7';}if(focused){releaseFocus();}if(quadrant){return;}resetPositions();scaleRings();drawEdges();fitAll();};

window.filters=function(){
  if(focused){return;}
  var cat=document.getElementById('catF').value, src=document.getElementById('srcF').value, typ=document.getElementById('typF').value;
  var tagEl=document.getElementById('tagF'); var tag=tagEl?tagEl.value:'';
  var impBoxes=[].slice.call(document.querySelectorAll('.impF'));
  var impAll=impBoxes.length===0||impBoxes.every(function(b){return b.checked;});
  var impSet=null;
  if(!impAll){impSet={};impBoxes.forEach(function(b){if(b.checked){impSet[b.value]=1;}});}
  var showR=document.getElementById('showRings').checked, showS=document.getElementById('showSub').checked, showE=document.getElementById('showEdges').checked;
  multiOnly = (src === '__multi__');
  lens = multiOnly ? '' : (src || '');
  buildKeyActors();
  var isoEl=document.getElementById('keyIsolate');
  var isolate=isoEl&&isoEl.checked;
  var shortSet=null;
  if(isolate){shortSet={};keyRank().forEach(function(n){shortSet[n.id]=1;});}
  rings.classList.toggle('hidden', quadrant||network||!showR); ringLabels.classList.toggle('hidden', quadrant||network||!showR);
  document.querySelectorAll('.node').forEach(function(g){
    var nd=IDX[g.getAttribute('data-id')];
    var isSub=(g.getAttribute('data-level')||'').toLowerCase()==='subdivisi\u00f3n';
    var catOk=!cat||g.getAttribute('data-category')===cat;
    var themeOk=multiOnly?(nd&&nd.multi):(!src||(nd&&(nd.themes||[]).some(function(t){return t.theme===src;})));
    var keyOk=!shortSet||(nd&&shortSet[nd.id]);
    var tagOk=!tag||(nd&&(nd.tags||[]).indexOf(tag)>=0);
    var impOk=!impSet||!!impSet[(nd&&nd.importance)||'__none__'];
    g.classList.toggle('hidden',!(catOk&&themeOk&&keyOk&&tagOk&&impOk&&(!isSub||showS)));});
  document.querySelectorAll('.edge').forEach(function(e){
    var ge=NODE_EL[e.getAttribute('data-source')], gt=NODE_EL[e.getAttribute('data-target')];
    var typeOk=!typ||findEdge(e)===typ;
    var ok=!quadrant&&showE&&typeOk&&ge&&gt&&!ge.classList.contains('hidden')&&!gt.classList.contains('hidden');
    e.classList.toggle('hidden',!ok);});
  relayout();
  resetPositions(); scaleRings(); drawEdges();
  var key=(quadrant?'q':(network?'n':'r'))+'|'+src+'|'+cat+'|'+showS+'|'+(isolate?KEYMODE+KEYN:'0')+'|'+tag+'|'+(impAll?'i*':impBoxes.filter(function(b){return b.checked;}).map(function(b){return b.value;}).join('~'));
  if(key!==lastKey){
    lastKey=key;
    if(quadrant){window.resetView();}else{fitAll();}
  }
};
function findEdge(el){var s=el.getAttribute('data-source'),t=el.getAttribute('data-target');for(var i=0;i<DATA.edges.length;i++){if(DATA.edges[i].source===s&&DATA.edges[i].target===t){return DATA.edges[i].type;}}return '';}

// ---- Foco en una entidad: sus subdivisiones forman un mapa local poder-interés ----
function localR(kid){
  var ir=kid.ir, n=NI;
  if(ir==null||ir<0||n<=1){return 200;}
  return 240-(240-110)*(ir/(n-1));
}
function focusEntity(id){
  var kids=CHILDREN[id]; if(!kids||!kids.length){return false;}
  var p=posOf(id)||{x:IDX[id].x,y:IDX[id].y};
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
  hint.textContent='Mapa local: '+IDX[id].label+'  \u00b7  click en el fondo para volver';
  hint.classList.remove('hidden');
  return true;
}
function releaseFocus(){
  focused=null;
  while(spokes.firstChild){spokes.removeChild(spokes.firstChild);}
  hint.classList.add('hidden');
  document.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight');});
  lastKey='';
  window.filters(); window.resetView();
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
    if(te){ei=te.interest;ep=te.power;eir=te.ir;epr=te.pr;lensTag=' \u00b7 dimensi\u00f3n '+escHtml(lens);}}
  var h='<div class="dtitle">'+escHtml(n.label)+'</div>';
  h+='<div class="pills"><span class="pill">'+escHtml(n.level||'\u2014')+'</span><span class="pill">'+escHtml(n.category||'\u2014')+'</span></div>';
  h+='<div class="statgrid"><b>Dimensi\u00f3n</b><span>'+escHtml(lens?lens:(n.source||'\u2014'))+'</span>'
    +'<b>Inter\u00e9s'+(lens?lensTag:'')+'</b><span>'+escHtml(ei||'\u2014')+'</span>'
    +'<b>Poder'+(lens?lensTag:'')+'</b><span>'+escHtml(ep||'\u2014')+'</span>'
    +(n.importance?('<b>Importancia</b><span>'+escHtml(n.importance)+'</span>'):'')
    +'<b>Conexiones</b><span>'+(DEG[id]||0)+'</span>'
    +'<b>Apoyo (entrante)</b><span>'+((SUPPORT[id]||0)>0?'+':'')+(SUPPORT[id]||0)+'</span></div>';
  var z=classify(epr,eir);
  h+='<div class="note"><b>'+z.l+'</b>'+(lens?' <span class="small">(seg\u00fan dimensi\u00f3n '+escHtml(lens)+')</span>':'')+'<br>'+z.a+'</div>';
  if(n.themes&&n.themes.length>1){
    h+='<div class="hkey" style="margin-top:8px">Por dimensi\u00f3n (inter\u00e9s \u00b7 poder)</div><div class="statgrid">'
      +n.themes.map(function(t){return '<b>'+escHtml(t.theme||'\u2014')+'</b><span>'+escHtml(t.interest||'\u2014')+' \u00b7 '+escHtml(t.power||'\u2014')+'</span>';}).join('')
      +'</div>';
  }
  if(n.tags&&n.tags.length){h+='<div class="hkey" style="margin-top:8px">Categor\u00edas</div><div class="pills">'+n.tags.map(function(t){return '<span class="pill">'+escHtml(t)+'</span>';}).join('')+'</div>';}
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
svg.addEventListener('click',function(){hideResults();clearSel();});
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

function fold(t){return String(t==null?'':t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function searchMatches(q){
  q=fold(q); if(!q){return [];}
  return DATA.nodes.filter(function(n){return fold(n.label).indexOf(q)>=0;}).slice(0,8);
}
function hideResults(){var ul=document.getElementById('searchResults');if(ul){ul.classList.add('hidden');ul.innerHTML='';}}
function pickResult(id){
  hideResults();
  var n=IDX[id]; var inp=document.getElementById('search');
  if(inp&&n){inp.value=n.label;}
  var g=NODE_EL[id];
  if(g&&g.classList.contains('hidden')){showInfo(id);flash('Este actor est\u00e1 oculto por los filtros actuales.');return;}
  selectNode(id);
}
window.searchInput=function(){
  var q=document.getElementById('search').value||'';
  var ul=document.getElementById('searchResults'); if(!ul){return;}
  if(!q.trim()){hideResults();return;}
  var m=searchMatches(q);
  if(!m.length){ul.innerHTML="<li class='sm'>Sin coincidencias</li>";ul.classList.remove('hidden');return;}
  ul.innerHTML=m.map(function(n){return "<li data-id='"+escHtml(n.id)+"'>"+escHtml(n.label)
    +"<span class='sm'>"+escHtml(n.category||'')+(n.source?(' \u00b7 '+escHtml(n.source)):'')+"</span></li>";}).join('');
  ul.classList.remove('hidden');
  ul.querySelectorAll('li[data-id]').forEach(function(li){li.addEventListener('click',function(e){e.stopPropagation();pickResult(li.getAttribute('data-id'));});});
};
window.searchKey=function(e){
  if(e.key==='Enter'){var m=searchMatches(document.getElementById('search').value||'');if(m.length){pickResult(m[0].id);}e.preventDefault();}
  else if(e.key==='Escape'){window.searchClear();}
};
window.searchClear=function(){var inp=document.getElementById('search');if(inp){inp.value='';}hideResults();clearSel();};
window.toggleFloatLegend=function(){
  var fl=document.getElementById('floatLegend'); if(!fl){return;}
  if(fl.classList.contains('hidden')){
    var src=document.getElementById('legendCard');
    var body=document.getElementById('floatLegendBody');
    if(src&&body){body.innerHTML=[].filter.call(src.children,function(el){return el.tagName!=='SUMMARY';}).map(function(el){return el.outerHTML;}).join('');}
    fl.classList.remove('hidden');
  } else {fl.classList.add('hidden');}
};
window.toggleRight=function(){document.getElementById('app').classList.toggle('hideRight');document.getElementById('right').classList.toggle('rightHidden');};

window.filterCat=function(c){if(focused){releaseFocus();}var s=document.getElementById('catF');if(s.value===c){c='';}s.value=c;window.filters();};
window.filterType=function(t){if(focused){releaseFocus();}var s=document.getElementById('typF');if(s.value===t){t='';}s.value=t;window.filters();};
window.filterSrc=function(v){if(focused){releaseFocus();}var s=document.getElementById('srcF');if(s.value===v){v='';}s.value=v;window.filters();};
function openRight(){document.getElementById('app').classList.remove('hideRight');document.getElementById('right').classList.remove('rightHidden');}
window.closeRight=function(){document.getElementById('app').classList.add('hideRight');document.getElementById('right').classList.add('rightHidden');};
/* ---- Actores clave: ranking por interés+poder o por conexiones ---- */
var KEYMODE='score', KEYN=5;
function keyScore(n){
  var lv=lensVals(n);
  var i=(lv.ir==null||lv.ir<0)?0:lv.ir/Math.max(NI-1,1);
  var p=(lv.pr==null||lv.pr<0)?0:lv.pr/Math.max(NP-1,1);
  return i+p;
}
function keyRank(){
  var arr=DATA.nodes.slice();
  if(lens){arr=arr.filter(function(n){return (n.themes||[]).some(function(t){return t.theme===lens;});});}
  if(KEYMODE==='deg'){arr.sort(function(a,b){return (DEG[b.id]||0)-(DEG[a.id]||0)||keyScore(b)-keyScore(a);});}
  else{arr.sort(function(a,b){return keyScore(b)-keyScore(a)||(DEG[b.id]||0)-(DEG[a.id]||0);});}
  return arr.slice(0,KEYN);
}
function buildKeyActors(){
  var ul=document.getElementById('keyList'); if(!ul){return;}
  ul.innerHTML=keyRank().map(function(n){
    var lv=lensVals(n);
    var meta=KEYMODE==='deg'?((DEG[n.id]||0)+' conex.'):(escHtml(lv.interest||'\u2014')+' \u00b7 '+escHtml(lv.power||'\u2014'));
    return "<li data-id='"+escHtml(n.id)+"'><span>"+escHtml(n.label)+"</span><span class='d'>"+meta+"</span></li>";
  }).join('');
  ul.querySelectorAll('li').forEach(function(li){li.addEventListener('click',function(){selectNode(li.getAttribute('data-id'));});});
}
window.setKeyMode=function(m){KEYMODE=m;document.querySelectorAll('.kmode').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-k')===m);});if(focused){releaseFocus();return;}window.filters();};
window.setKeyN=function(n){KEYN=n;document.querySelectorAll('.kn').forEach(function(b){b.classList.toggle('active',+b.getAttribute('data-n')===n);});if(focused){releaseFocus();return;}window.filters();};

var EXPORT_CSS=".ring{fill:none;stroke:#d6dbe3;stroke-dasharray:6 6}.ringlab{fill:#8a93a0;font-weight:600;font-size:13px;paint-order:stroke;stroke:#ffffff;stroke-width:4px}.spoke{stroke:#aab2bf;stroke-width:1.5;stroke-dasharray:3 4}.edge{fill:none;opacity:.5}.node circle{stroke-width:3px}.node text{font-family:Arial,Segoe UI,sans-serif;font-weight:600}.hidden{display:none}.qline{stroke:#c3cad6;stroke-width:1.5}.qlab{font-size:14px;fill:#5b6675;font-weight:700}.qtick{font-size:15px;fill:#39424f;font-weight:700}.qaxis{font-size:16px;fill:#39424f;font-weight:700}";
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
  if(quadrant){bb={x:40,y:40,w:1520,h:1020};pad=30;}
  var vis={}; document.querySelectorAll('.node').forEach(function(g){if(!g.classList.contains('hidden')){var n=IDX[g.getAttribute('data-id')];if(n&&n.category){vis[n.category]=n.fill;}}});
  var cats=vis; var catList=Object.keys(cats).sort(), perRow=3, lrows=Math.max(1,Math.ceil(catList.length/perRow));
  var legendH=34+lrows*24+18;
  var W=bb.w+pad*2, H=bb.h+pad*2+titleH+legendH, vbx=bb.x-pad, vby=bb.y-pad-titleH;
  var clone=svg.cloneNode(true);
  clone.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight','nolbl');});
  var inner=clone.innerHTML;
  var mode=quadrant?'cuadrante (poder\u2013inter\u00e9s)':(network?'conexiones (red)':'poder\u2013inter\u00e9s');
  var lensTag=lens?(' \u00b7 dimensi\u00f3n: '+lens):(multiOnly?' \u00b7 solo entidades en varias dimensiones':' \u00b7 consolidado');
  var title="<text x='"+(bb.x+bb.w/2)+"' y='"+(bb.y-pad-titleH/2+8)+"' text-anchor='middle' font-size='26' font-weight='700' fill='#1f2733'>Mapa de Stakeholders \u00b7 Vista "+mode+lensTag+"</text>";
  var ly=bb.y+bb.h+pad+26;
  var key=quadrant?'Cuadrante de Mendelow  \u00b7  tama\u00f1o uniforme  \u00b7  posici\u00f3n = inter\u00e9s (x) y poder (y)':(network?'Distribuci\u00f3n por relaciones (systems thinking)  \u00b7  tama\u00f1o uniforme  \u00b7  borde = dimensi\u00f3n':'tama\u00f1o = poder  \u00b7  distancia al centro = inter\u00e9s  \u00b7  borde = dimensi\u00f3n');
  if(lens){key+='  \u00b7  valores de la dimensi\u00f3n '+lens;}
  var leg="<text x='"+bb.x+"' y='"+(ly-8)+"' font-size='15' font-weight='700' fill='#39424f'>Esferas  \u00b7  "+escHtml(key)+"</text>";
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
    id:n.id, nombre:n.label, esfera:n.category, categorias:(n.tags||[]).join('; '), importancia:(n.importance||''), dimension:n.source, nivel:n.level,
    poder:n.power, interes:n.interest, conexiones:(DEG[n.id]||0), apoyo_entrante:(SUPPORT[n.id]||0),
    clasificacion:z.l, accion_sugerida:z.a};});
  download('stakeholder_estrategia.csv',rows);
};
window.downloadSVG=function(){var b=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='stakeholder_map.svg';a.click();};

details.innerHTML=DEFAULT_DETAILS; applyEdgeColors(); window.filters();
})();
