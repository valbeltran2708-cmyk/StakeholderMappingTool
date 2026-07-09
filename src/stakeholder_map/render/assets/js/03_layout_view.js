var POLCOL={pos:'#2e9e5b',neg:'#d64545',neu:'#9aa3af'};
var ZONE=LANGZONE.es;
function isHigh(rank,n){return n>1?(rank>=(n-1)/2):(rank>=0);}
function zoneKey(pr,ir){if(pr==null||pr<0||ir==null||ir<0){return 'no';}var pH=isHigh(pr,DATA.NP||1),iH=isHigh(ir,DATA.NI||1);return pH&&iH?'cm':(pH&&!iH?'ks':(!pH&&iH?'ki':'mo'));}
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
function defaultDetails(){return '<div class="dtitle">'+escHtml(t('d_select'))+'</div><p class="small">'+escHtml(t('d_select_txt'))+'</p>';}
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
// Tooltips de la interfaz: cualquier [data-tip] muestra t(clave) al pasar el cursor.
function uiTipEl(){return document.getElementById('uiTip');}
function moveUiTip(e){var u=uiTipEl();if(!u){return;}var w=u.offsetWidth||200,h=u.offsetHeight||40,x=e.clientX+14,y=e.clientY+16;if(x+w>window.innerWidth-8){x=e.clientX-w-12;}if(y+h>window.innerHeight-8){y=e.clientY-h-12;}u.style.left=Math.max(6,x)+'px';u.style.top=Math.max(6,y)+'px';}
document.addEventListener('mouseover',function(e){var el=e.target&&e.target.closest?e.target.closest('[data-tip]'):null;if(!el){return;}var u=uiTipEl();if(!u){return;}var txt=t(el.getAttribute('data-tip'));if(!txt){return;}u.textContent=txt;u.classList.remove('hidden');moveUiTip(e);});
document.addEventListener('mousemove',function(e){var u=uiTipEl();if(!u||u.classList.contains('hidden')){return;}if(!(e.target&&e.target.closest&&e.target.closest('[data-tip]'))){u.classList.add('hidden');return;}moveUiTip(e);});
document.addEventListener('mouseout',function(e){var el=e.target&&e.target.closest?e.target.closest('[data-tip]'):null;if(!el){return;}var to=e.relatedTarget;if(to&&to.closest&&to.closest('[data-tip]')===el){return;}var u=uiTipEl();if(u){u.classList.add('hidden');}});
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
  g.querySelectorAll('.lbl').forEach(function(lb){lb.setAttribute('transform','scale('+(r/base).toFixed(3)+')');});
});}
function curPos(g){var m=/translate\(([-\d.]+) *,? *([-\d.]+)\)/.exec(g.getAttribute('transform')||'');return m?{x:parseFloat(m[1]),y:parseFloat(m[2])}:nodePos(g);}
function edgePath(a,b,off){var dx=b.x-a.x,dy=b.y-a.y,mx=(a.x+b.x)/2,my=(a.y+b.y)/2,ln=Math.hypot(dx,dy)||1,nx=-dy/ln,ny=dx/ln;return 'M '+a.x+' '+a.y+' Q '+(mx+nx*(40+off))+' '+(my+ny*(40+off))+' '+b.x+' '+b.y;}
function drawEdges(){document.querySelectorAll('.edge').forEach(function(p){var a=posOf(p.getAttribute('data-source')),b=posOf(p.getAttribute('data-target'));if(!a||!b){return;}var off=parseFloat(p.getAttribute('data-curv'))||0;p.setAttribute('d',edgePath(a,b,off));});}
function scaleRings(){document.querySelectorAll('#ringBands circle, #rings circle').forEach(function(c){var r=parseFloat(c.getAttribute('data-r'));if(r){c.setAttribute('r',r*spread);}});document.querySelectorAll('#ringLabels text').forEach(function(t){var r=parseFloat(t.getAttribute('data-r'));if(r){t.setAttribute('y',550-r*spread-8);}});}
function fitAll(){var bb=visBBox(),pad=70,cx=bb.x+bb.w/2,cy=bb.y+bb.h/2,w=bb.w+pad*2,h=bb.h+pad*2,sc=Math.max(w/1600,h/1100,0.1);if(!quadrant&&!network){sc=Math.max(sc,0.55);}w=1600*sc;h=1100*sc;view={x:cx-w/2,y:cy-h/2,w:w,h:h};setView();}
window.setSpread=function(v){spread=parseFloat(v)||1;var sv=document.getElementById('spreadVal');if(sv){sv.textContent=spread.toFixed(2)+'\u00d7';}if(focused){releaseFocus();}if(quadrant){return;}resetPositions();scaleRings();drawEdges();fitAll();};

