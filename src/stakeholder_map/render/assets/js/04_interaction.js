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
  if(bands){bands.classList.toggle('hidden', quadrant||network||!showR);}
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
function findEdge(el){return el.getAttribute('data-type')||'';}

// ---- Foco en una entidad: sus subdivisiones forman un mapa local poder-interés ----
function localR(kid){
  var ir=kid.ir, n=NI;
  if(ir==null||ir<0||n<=1){return 200;}
  return 240-(240-110)*(ir/(n-1));
}
function focusEntity(id){
  var kids=CHILDREN[id]; if(!kids||!kids.length){return false;}
  var p=posOf(id)||{x:IDX[id].x,y:IDX[id].y};
  rings.classList.add('hidden'); ringLabels.classList.add('hidden'); if(bands){bands.classList.add('hidden');}
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
  hint.textContent=(LANG_CUR==='en'?'Local map: ':'Mapa local: ')+nodeLabel(IDX[id])+'  \u00b7  '+(LANG_CUR==='en'?'click the background to return':'click en el fondo para volver');
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
  var qb=document.getElementById('qbtn'); if(qb){qb.textContent=quadrant?t('to_radial'):t('to_quad');}
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
    if(id===focused){releaseFocus();details.innerHTML=defaultDetails();CURSEL=null;return;}
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
  if(!arr.length){return '<p class="small">'+escHtml(t('g_no_rel'))+'</p>';}
  return '<ul class="rellist">'+arr.map(function(e){var o=getOther(e)||{};return '<li><span class="ra">'+arrow+'</span><span class="rn">'+escHtml(nodeLabel(o))+'</span><span class="rm">'+escHtml(term(e.type))+' \u00b7 '+escHtml(t('g_strength'))+' '+escHtml(e.strength)+'</span></li>';}).join('')+'</ul>';
}
function showInfo(id){
  var n=byId(id);if(!n){return;}
  var out=DATA.edges.filter(function(e){return e.source===id;});
  var inc=DATA.edges.filter(function(e){return e.target===id;});
  var kids=CHILDREN[id]||[];
  var ei=n.interest, ep=n.power, eir=n.ir, epr=n.pr, lensTag='';
  if(lens){var te=(n.themes||[]).filter(function(t){return t.theme===lens;})[0];
    if(te){ei=te.interest;ep=te.power;eir=te.ir;epr=te.pr;lensTag=' \u00b7 '+t('g_by_dim_tag')+' '+escHtml(term(lens));}}
  CURSEL=id;
  var h='<div class="dtitle">'+escHtml(nodeLabel(n))+(nodeAlias(n)?(' <span class="small">('+escHtml(nodeAlias(n))+')</span>'):'')+'</div>';
  h+='<div class="pills"><span class="pill">'+escHtml(n.level?term(n.level):'\u2014')+'</span><span class="pill">'+escHtml(n.category?term(n.category):'\u2014')+'</span></div>';
  h+='<div class="statgrid"><b>'+escHtml(t('g_dimension'))+'</b><span>'+escHtml(lens?term(lens):(n.source?term(n.source):'\u2014'))+'</span>'
    +'<b>'+escHtml(t('g_interest'))+(lens?lensTag:'')+'</b><span>'+escHtml(ei||'\u2014')+'</span>'
    +'<b>'+escHtml(t('g_power'))+(lens?lensTag:'')+'</b><span>'+escHtml(ep||'\u2014')+'</span>'
    +(n.importance?('<b>'+escHtml(t('g_importance'))+'</b><span>'+escHtml(n.importance)+'</span>'):'')
    +'<b>'+escHtml(t('g_connections'))+'</b><span>'+(DEG[id]||0)+'</span>'
    +'<b>'+escHtml(t('g_support'))+'</b><span>'+((SUPPORT[id]||0)>0?'+':'')+(SUPPORT[id]||0)+'</span></div>';
  var z=classify(epr,eir);
  h+='<div class="note"><b>'+z.l+'</b>'+(lens?' <span class="small">('+(LANG_CUR==='en'?'by '+t('g_by_dim_tag')+' ':'seg\u00fan '+t('g_by_dim_tag')+' ')+escHtml(term(lens))+')</span>':'')+'<br>'+z.a+'</div>';
  if(n.themes&&n.themes.length>1){
    h+='<div class="hkey" style="margin-top:8px">'+escHtml(t('g_by_dim'))+'</div><div class="statgrid">'
      +n.themes.map(function(tt){return '<b>'+escHtml(tt.theme?term(tt.theme):'\u2014')+'</b><span>'+escHtml(tt.interest||'\u2014')+' \u00b7 '+escHtml(tt.power||'\u2014')+'</span>';}).join('')
      +'</div>';
  }
  if(n.tags&&n.tags.length){h+='<div class="hkey" style="margin-top:8px">'+escHtml(t('g_categories'))+'</div><div class="pills">'+n.tags.map(function(tg){return '<span class="pill">'+escHtml(term(tg))+'</span>';}).join('')+'</div>';}
  if(nodeDesc(n)){h+='<p class="dtext">'+escHtml(nodeDesc(n))+'</p>';}
  if(n.notes){h+='<p class="small"><b>'+escHtml(t('g_notes'))+':</b> '+escHtml(n.notes)+'</p>';}
  if(kids.length){h+='<div class="note">'+kids.length+(LANG_CUR==='en'?' subdivision(s). Clicking the entity opens its local map: distance = own interest, size = own power.':' subdivisi\u00f3n(es). Click en la entidad abre su mapa local: distancia = inter\u00e9s propio, tama\u00f1o = poder propio.')+'</div>';}
  h+='<h4>'+escHtml(t('g_out_rel'))+' ('+out.length+')</h4>'+relList(out,'\u2192',function(e){return byId(e.target);});
  h+='<h4>'+escHtml(t('g_in_rel'))+' ('+inc.length+')</h4>'+relList(inc,'\u2190',function(e){return byId(e.source);});
  details.innerHTML=h; openRight();
}
function clearSel(){
  if(focused){releaseFocus();details.innerHTML=defaultDetails();CURSEL=null;closeRight();return;}
  document.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight');});
  details.innerHTML=defaultDetails(); CURSEL=null; closeRight(); if(!quadrant){window.filters();}
}
svg.addEventListener('click',function(){hideResults();clearSel();});
document.querySelectorAll('.node').forEach(function(g){
  var id=g.getAttribute('data-id'); NODE_EL[id]=g;
  g.addEventListener('click',function(e){e.stopPropagation();selectNode(id);});
  g.addEventListener('mouseenter',function(e){var n=IDX[id];if(!n){return;}showTip('<b>'+escHtml(nodeLabel(n))+'</b>'+escHtml(t('g_interest'))+': '+escHtml(n.interest||'\u2014')+' \u00b7 '+escHtml(t('g_power'))+': '+escHtml(n.power||'\u2014')+'<br>'+escHtml(t('g_connections'))+': '+(DEG[id]||0),e);});
  g.addEventListener('mousemove',moveTip);
  g.addEventListener('mouseleave',hideTip);
});
document.querySelectorAll('.edge').forEach(function(p){
  p.addEventListener('mouseenter',function(e){var s=p.getAttribute('data-source'),t=p.getAttribute('data-target'),ed=null;for(var i=0;i<DATA.edges.length;i++){if(DATA.edges[i].source===s&&DATA.edges[i].target===t){ed=DATA.edges[i];break;}}if(!ed){return;}var sn=IDX[s]||{},tn=IDX[t]||{};showTip('<b>'+escHtml(ed.type?term(ed.type):t('g_relationship'))+'</b>'+escHtml(nodeLabel(sn))+' \u2192 '+escHtml(nodeLabel(tn))+'<br>'+escHtml(t('g_strength_cap'))+': '+escHtml(ed.strength),e);});
  p.addEventListener('mousemove',moveTip);
  p.addEventListener('mouseleave',hideTip);
});

function fold(t){return String(t==null?'':t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function searchMatches(q){
  q=fold(q); if(!q){return [];}
  return DATA.nodes.filter(function(n){return fold(n.label).indexOf(q)>=0||fold(n.alias).indexOf(q)>=0||fold(n.label_en).indexOf(q)>=0||fold(n.alias_en).indexOf(q)>=0;}).slice(0,8);
}
function hideResults(){var ul=document.getElementById('searchResults');if(ul){ul.classList.add('hidden');ul.innerHTML='';}}
function pickResult(id){
  hideResults();
  var n=IDX[id]; var inp=document.getElementById('search');
  if(inp&&n){inp.value=nodeLabel(n);}
  var g=NODE_EL[id];
  if(g&&g.classList.contains('hidden')){showInfo(id);flash(t('f_hidden'));return;}
  selectNode(id);
}
window.searchInput=function(){
  var q=document.getElementById('search').value||'';
  var ul=document.getElementById('searchResults'); if(!ul){return;}
  if(!q.trim()){hideResults();return;}
  var m=searchMatches(q);
  if(!m.length){ul.innerHTML="<li class='sm'>"+(LANG_CUR==='en'?'No matches':'Sin coincidencias')+"</li>";ul.classList.remove('hidden');return;}
  ul.innerHTML=m.map(function(n){return "<li data-id='"+escHtml(n.id)+"'>"+escHtml(nodeLabel(n))+(nodeAlias(n)?(' <span class="sm" style="display:inline">('+escHtml(nodeAlias(n))+')</span>'):'')
    +"<span class='sm'>"+escHtml(n.category?term(n.category):'')+(n.source?(' \u00b7 '+escHtml(term(n.source))):'')+"</span></li>";}).join('');
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
    return "<li data-id='"+escHtml(n.id)+"'><span>"+escHtml(nodeAlias(n)||nodeLabel(n))+"</span><span class='d'>"+meta+"</span></li>";
  }).join('');
  ul.querySelectorAll('li').forEach(function(li){li.addEventListener('click',function(){selectNode(li.getAttribute('data-id'));});});
}
window.setKeyMode=function(m){KEYMODE=m;document.querySelectorAll('.kmode').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-k')===m);});if(focused){releaseFocus();return;}window.filters();};
window.setKeyN=function(n){KEYN=n;document.querySelectorAll('.kn').forEach(function(b){b.classList.toggle('active',+b.getAttribute('data-n')===n);});if(focused){releaseFocus();return;}window.filters();};
