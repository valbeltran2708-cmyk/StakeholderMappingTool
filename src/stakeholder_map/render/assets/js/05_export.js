
var EXPORT_CSS=".band{stroke:none}.ring{fill:none;stroke:#d6dbe3;stroke-dasharray:6 6}.ringlab{fill:#8a93a0;font-weight:600;font-size:13px;paint-order:stroke;stroke:#ffffff;stroke-width:4px}.spoke{stroke:#aab2bf;stroke-width:1.5;stroke-dasharray:3 4}.edge{fill:none;opacity:.5}.node circle{stroke-width:3px}.node text{font-weight:600}.hidden{display:none}.lblF{display:none}.qline{stroke:#c3cad6;stroke-width:1.5}.qlab{font-size:14px;fill:#5b6675;font-weight:700}.qtick{font-size:15px;fill:#39424f;font-weight:700}.qaxis{font-size:16px;fill:#39424f;font-weight:700}";
var EXP_FONTS={arial:"Arial, Helvetica, sans-serif",georgia:"Georgia, 'Times New Roman', serif",times:"'Times New Roman', Times, serif",calibri:"Calibri, 'Segoe UI', Arial, sans-serif"};
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
function _hex6(h){h=String(h).replace('#','');if(h.length===3){h=h.split('').map(function(c){return c+c;}).join('');}return h;}
function toGray(hex){
  var h=_hex6(hex); var r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  if(isNaN(r)||isNaN(g)||isNaN(b)){return hex;}
  var l=Math.round(0.299*r+0.587*g+0.114*b); var s=('0'+l.toString(16)).slice(-2);
  return '#'+s+s+s;
}
function grayify(root){
  var els=[root].concat([].slice.call(root.querySelectorAll('*')));
  els.forEach(function(el){
    ['fill','stroke'].forEach(function(a){
      var v=el.getAttribute&&el.getAttribute(a);
      if(v&&v.charAt(0)==='#'){el.setAttribute(a,toGray(v));}
    });
    var st=el.getAttribute&&el.getAttribute('style');
    if(st&&st.indexOf('#')>=0){el.setAttribute('style',st.replace(/#[0-9a-fA-F]{3,6}/g,function(m){return toGray(m);}));}
  });
}
window.openExport=function(){
  var back=document.getElementById('expBack'); if(!back){return;}
  var modeName=quadrant?t('v_quad'):(network?t('v_net'):t('v_pi'));
  var sub=document.getElementById('expSubtitle');
  var auto=t('view')+' '+modeName+(lens?(' \u00b7 '+t('sub_dim')+': '+term(lens)):(multiOnly?' \u00b7 '+t('sub_multi'):' \u00b7 '+t('sub_consol')));
  if(sub&&!sub.value){sub.value=auto;}
  var ti=document.getElementById('expTitle'); if(ti&&!ti.value){ti.value='Mapa de Stakeholders';}
  var hasAlias=DATA.nodes.some(function(n){return n.alias;});
  document.querySelectorAll("input[name='expLbl']").forEach(function(r){
    if(r.value==='alias'){r.disabled=!hasAlias; if(!hasAlias){r.checked=false;}}
    if(r.value==='full'&&!hasAlias){r.checked=true;}
  });
  var lz=document.getElementById('expLegSize');
  if(lz){lz.disabled=quadrant||network; if(lz.disabled){lz.checked=false;}else if(!lz.dataset.touched){lz.checked=true;}}
  var box=document.getElementById('expRelTypes'), blk=document.getElementById('expRelBlock');
  var vis={}; document.querySelectorAll('.edge:not(.hidden)').forEach(function(e){var t=e.getAttribute('data-type');if(t){vis[t]=1;}});
  var types=Object.keys(vis).sort();
  if(blk){blk.style.display=types.length?'':'none';}
  if(box){box.innerHTML=types.map(function(t){return "<label class='chk'><input type='checkbox' class='expRelT' value=\""+escHtml(t)+"\" checked> "+escHtml(t)+"</label>";}).join('');}
  back.classList.remove('hidden');
  if(window.expTab){window.expTab('contenido');}
  updateExpPreview();
};
window.closeExport=function(){var back=document.getElementById('expBack');if(back){back.classList.add('hidden');}};
function collectExpOpts(){
  function radio(n){var el=document.querySelector("input[name='"+n+"']:checked");return el?el.value:'';}
  var legs={}; document.querySelectorAll('.expLeg:checked').forEach(function(c){legs[c.value]=1;});
  var rel=null; var boxes=document.querySelectorAll('.expRelT');
  if(boxes.length){rel={}; document.querySelectorAll('.expRelT:checked').forEach(function(c){rel[c.value]=1;});}
  var fe=document.getElementById('expFecha'), fo=document.getElementById('expFootOn');
  var nm=document.getElementById('expNum'), nl=document.getElementById('expNumLen');
  var ic=document.getElementById('expIdxCols'), ifz=document.getElementById('expIdxFont');
  var icv=(ic||{}).value||'auto';
  return {
    title:(document.getElementById('expTitle')||{}).value||'Mapa de Stakeholders',
    sub:(document.getElementById('expSubtitle')||{}).value||'',
    showKey:!!(document.getElementById('expShowKey')||{}).checked,
    lbl:radio('expLbl')||'alias', gray:radio('expColor')==='gray',
    font:(document.getElementById('expFont')||{}).value||'arial',
    scale:parseInt(radio('expScale')||'2',10)||2,
    bg:radio('expBg')||'white',
    pos:radio('expLegPos')||'bottom',
    legs:legs, rel:rel,
    num:!!(nm&&nm.checked), numLen:Math.max(4,parseInt((nl||{}).value||'14',10)||14),
    idxCols:(icv==='auto'?0:Math.max(1,Math.min(8,parseInt(icv,10)||0))),
    idxLabel:radio('expIdxLbl')||'both',
    idxFont:Math.max(7,Math.min(20,parseInt((ifz||{}).value||'12',10)||12)),
    idxGap:Math.max(4,Math.min(80,parseInt((document.getElementById('expIdxGap')||{}).value||'18',10)||18)),
    showTitle:(document.getElementById('expShowTitle')?document.getElementById('expShowTitle').checked:true),
    showSub:(document.getElementById('expShowSub')?document.getElementById('expShowSub').checked:true),
    footOn:!fo||fo.checked,
    figura:(document.getElementById('expFigura')||{}).value||'',
    fuente:(document.getElementById('expFuente')||{}).value||'Elaboraci\u00f3n propia',
    fecha:!fe||fe.checked
  };
}
function buildExportSVG(opts){
  opts=opts||collectExpOpts();
  var bb, pad;
  if(quadrant){bb={x:40,y:40,w:1520,h:1020};pad=30;}
  else if(network){bb=visBBox();pad=90;}
  else{
    // Radial: marco centrado en el origen para que anillos y nodos queden
    // COMPLETOS; los anillos que no caben se eliminan, nunca se cortan.
    var maxR=0;
    document.querySelectorAll('.node').forEach(function(g){
      if(g.classList.contains('hidden')){return;}
      var p=curPos(g); maxR=Math.max(maxR,Math.hypot(p.x-800,p.y-550)+curR(g));
    });
    maxR=Math.max(maxR,120);
    bb={x:800-maxR,y:550-maxR,w:2*maxR,h:2*maxR};pad=90;
  }
  var clone=svg.cloneNode(true);
  clone.querySelectorAll('.node,.edge').forEach(function(el){el.classList.remove('dim','selected','direct','highlight','nolbl');});
  if(!quadrant&&!network){
    var lim=bb.w/2+pad-24;
    clone.querySelectorAll('#ringBands circle, #rings circle').forEach(function(c){if(parseFloat(c.getAttribute('r'))>lim){c.parentNode.removeChild(c);}});
    clone.querySelectorAll('#ringLabels text').forEach(function(t){
      var r=parseFloat(t.getAttribute('data-r'))*spread;
      if(r>lim){t.parentNode.removeChild(t);}});
  }
  // etiquetas: elegir el grupo según idioma y modo actuales, quitar el resto
  clone.querySelectorAll('.node').forEach(function(g){
    var want = (opts.lbl==='full')
      ? ((LANG_CUR==='en')?['lblFen','lblF','lblAen','lblA']:['lblF','lblA'])
      : ((LANG_CUR==='en')?['lblAen','lblA']:['lblA']);   // 'alias' y 'num' usan base alias
    var kept=null;
    for(var i=0;i<want.length&&!kept;i++){var el=g.querySelector('.'+want[i]); if(el){kept=el;}}
    g.querySelectorAll('.lbl').forEach(function(x){
      if(x===kept){x.setAttribute('class','lbl lblA'); x.style.display='inline';}
      else {x.parentNode.removeChild(x);}
    });
  });
  // numeración: modo "número" (todos) o refinamiento "numerar si supera N caracteres"
  var numIndex=[];
  var numberAll=(opts.lbl==='num');
  if(numberAll||opts.num){
    var cand=[];
    clone.querySelectorAll('.node:not(.hidden)').forEach(function(g){
      var n=IDX[g.getAttribute('data-id')]; if(!n){return;}
      if(numberAll){cand.push({g:g,n:n});return;}
      var disp=(opts.lbl==='full')?nodeLabel(n):(nodeAlias(n)||nodeLabel(n));
      if(String(disp).length>opts.numLen){cand.push({g:g,n:n});}
    });
    cand.sort(function(a,b){return String(nodeLabel(a.n)).localeCompare(String(nodeLabel(b.n)));});
    cand.forEach(function(it,k){
      var num=k+1; numIndex.push({num:num,n:it.n});
      var lb=it.g.querySelector('.lbl');
      var r=parseFloat(it.g.querySelector('circle').getAttribute('r'))||20;
      var fill='#FFFFFF';
      var t0=lb&&lb.querySelector('text');
      if(t0){var st=t0.getAttribute('style')||'';var m=/fill:(#[0-9a-fA-F]{3,6})/.exec(st);if(m){fill=m[1];}}
      if(lb){
        while(lb.firstChild){lb.removeChild(lb.firstChild);}
        var tx=clone.ownerDocument.createElementNS('http://www.w3.org/2000/svg','text');
        tx.setAttribute('text-anchor','middle');tx.setAttribute('dominant-baseline','middle');
        tx.setAttribute('font-size',Math.max(12,Math.min(Math.round(r*0.95),24)));
        tx.setAttribute('style','fill:'+fill);tx.textContent=String(num);
        lb.appendChild(tx);
      }
    });
  }
  if(opts.rel){
    clone.querySelectorAll('.edge').forEach(function(e){
      var t=e.getAttribute('data-type')||'';
      if(!opts.rel[t]){e.parentNode.removeChild(e);}
    });
  }
  if(opts.gray){grayify(clone);}
  function idxText(it){var full=nodeLabel(it.n),al=nodeAlias(it.n);var body=(opts.idxLabel==='name')?full:((opts.idxLabel==='alias')?(al||full):(full+(al?(' ('+al+')'):'')));return it.num+'. '+body;}
  var inner=clone.innerHTML;

  // ------- leyenda por bloques (abajo o a la derecha) -------
  var ink='#1f2733', mut='#5b6675', soft='#6b7480', line='#c9d0d8';
  function G(c){return opts.gray?toGray(c):c;}
  var right=(opts.pos==='right');
  // Ancho del panel derecho: crece para alojar el índice en varias columnas
  // (acotadas al alto de la figura) sin cortar nombres.
  var idxFs=opts.idxFont||12, idxCharW=idxFs*0.55, idxRowH=idxFs+8;
  var ls=idxFs/12.5, idxGap=(opts.idxGap!=null?opts.idxGap:18);
  var idxColsRight=1, idxNeedW=0;
  if(numIndex.length){
    var lc=0;
    numIndex.forEach(function(it){var L=idxText(it).length; if(L>lc){lc=L;}});
    idxNeedW=lc*idxCharW+16;
    if(right){
      if(opts.idxCols>0){ idxColsRight=opts.idxCols; }   // el usuario fija las columnas
      else {
        var perColR=Math.max(4, Math.floor(bb.h/idxRowH));
        var ncR=Math.ceil(numIndex.length/perColR);
        if(numIndex.length>Math.floor(bb.h/idxRowH*0.55)){ncR=Math.max(ncR,2);}  // mismo criterio que abajo
        idxColsRight=Math.min(3, Math.max(1, ncR));
      }
    }
  }
  var LW=right?Math.max(300, Math.round(idxColsRight*idxNeedW+(idxColsRight-1)*idxGap)+24):300;
  var legW=right?(LW-20):bb.w;
  var perRowItems=right?1:3, perRowRel=right?1:2, colW=legW/perRowItems, colWRel=legW/perRowRel;
  var legSVG='', ly=0, lx0=0, rowH=Math.round(24*ls);
  function header(txt){legSVG+="<text x='"+lx0+"' y='"+ly+"' font-size='"+Math.round(13*ls)+"' font-weight='700' fill='"+mut+"'>"+escHtml(txt)+"</text>"; ly+=Math.round(20*ls);}
  function itemsN(arr,swatch,per,cw){
    arr.forEach(function(it,i){
      var col=i%per,row=Math.floor(i/per),x=lx0+col*cw,y=ly+row*rowH;
      legSVG+=swatch(x,y,it);
      legSVG+="<text x='"+(x+(it.off||24))+"' y='"+(y+12)+"' font-size='"+idxFs+"' fill='"+ink+"'>"+escHtml(it.name)+"</text>";
    });
    ly+=Math.ceil(arr.length/per)*rowH+8;
  }
  var visNodes=[]; document.querySelectorAll('.node:not(.hidden)').forEach(function(g){var n=IDX[g.getAttribute('data-id')];if(n){visNodes.push(n);}});
  if(opts.legs.esf){
    var cats={}; visNodes.forEach(function(n){if(n.category){cats[n.category]=n.fill;}});
    var arr=Object.keys(cats).sort().map(function(k){return {name:term(k),c:cats[k]};});
    if(arr.length){header(t('l_spheres'));
      itemsN(arr,function(x,y,it){return "<rect x='"+x+"' y='"+(y+1)+"' width='15' height='15' rx='3' fill='"+G(it.c)+"' stroke='#99a'/>";},perRowItems,colW);}
  }
  if(opts.legs.dim){
    var srcs={}; var anyMulti=false;
    visNodes.forEach(function(n){ if(n.multi){anyMulti=true;} else if(n.source){srcs[n.source]=n.stroke;} });
    var arr2=Object.keys(srcs).sort().map(function(k){return {name:term(k),c:srcs[k]};});
    if(anyMulti){var nDims=Object.keys(srcs).length; arr2.push({name:(LANG_CUR==='en'?(nDims===2?'In both dimensions':'In several dimensions'):(nDims===2?'En ambas dimensiones':'En varias dimensiones')),c:'#111111',_nt:1});}
    if(arr2.length){header(t('l_dims'));
      itemsN(arr2,function(x,y,it){return "<rect x='"+x+"' y='"+(y+1)+"' width='15' height='15' rx='3' fill='#ffffff' stroke='"+G(it.c)+"' stroke-width='3'/>";},perRowItems,colW);}
  }
  if(opts.legs.rel){
    var tps={}; clone.querySelectorAll('.edge:not(.hidden)').forEach(function(e){var t=e.getAttribute('data-type');if(t&&!(t in tps)){tps[t]={c:e.getAttribute('data-typecolor')||'#999',d:!!e.getAttribute('stroke-dasharray')};}});
    var arr3=Object.keys(tps).sort().map(function(k){return {name:term(k),c:tps[k].c,d:tps[k].d,off:34};});
    if(arr3.length){header(t('l_rels'));
      itemsN(arr3,function(x,y,it){return "<line x1='"+x+"' y1='"+(y+9)+"' x2='"+(x+26)+"' y2='"+(y+9)+"' stroke='"+G(it.c)+"' stroke-width='3'"+(it.d?" stroke-dasharray='7 5'":"")+"/>";},perRowRel,colWRel);}
  }
  if(opts.legs.size&&!quadrant&&!network){
    header(t('h_size'));
    var po=DATA.power_order||[], lo=po[0]||'', hi=po[po.length-1]||'';
    var cx0=lx0+22, cy0=ly+18;
    legSVG+="<circle cx='"+cx0+"' cy='"+cy0+"' r='18' fill='"+G('#c7ccd3')+"'/>";
    legSVG+="<circle cx='"+cx0+"' cy='"+cy0+"' r='13' fill='"+G('#8a94a0')+"'/>";
    legSVG+="<circle cx='"+cx0+"' cy='"+cy0+"' r='8' fill='"+G('#4b5563')+"'/>";
    legSVG+="<text x='"+(cx0+30)+"' y='"+(cy0+4)+"' font-size='"+Math.round(12*ls)+"' fill='"+soft+"'>"+escHtml(t('size_from'))+" "+escHtml(String(lo))+" "+escHtml(t('size_inner'))+" "+escHtml(String(hi))+" "+escHtml(t('size_outer'))+"</text>";
    ly+=Math.round(48*ls);
  }
  if(numIndex.length){
    header(t('conventions'));
    // El índice debe mostrar el nombre COMPLETO (ese es su propósito), así
    // que solo se usan dos columnas cuando la leyenda va abajo, hay bastantes
    // entradas y el ancho de cada columna alcanza para el nombre más largo.
    var longest=0;
    numIndex.forEach(function(it){var L=idxText(it).length;if(L>longest){longest=L;}});
    var needW=longest*idxCharW+16, gap=idxGap, rowH2=idxRowH, ncol;
    if(opts.idxCols>0){
      ncol=opts.idxCols;                          // columnas fijadas por el usuario
    } else if(right){
      ncol=idxColsRight;
    } else {
      // Auto (abajo): tantas columnas como quepan sin cortar nombres, acotadas
      // al alto de la figura; una sola si la lista es corta.
      var maxColsW=Math.max(1, Math.floor((legW+gap)/(needW+gap)));
      ncol=Math.ceil(numIndex.length/Math.max(4, Math.floor(bb.h/rowH2)));
      if(numIndex.length>Math.floor(bb.h/rowH2*0.55)){ncol=Math.max(ncol,2);}
      ncol=Math.max(1,Math.min(ncol,maxColsW));
    }
    var cw=(ncol>1?(needW+gap):legW), rows=Math.ceil(numIndex.length/ncol);
    for(var ci=0;ci<numIndex.length;ci++){
      var it=numIndex[ci];
      var col=Math.floor(ci/rows), row=ci%rows;   // llenado por columnas
      var x=lx0+col*cw, y=ly+row*rowH2;
      var full=idxText(it);
      legSVG+="<text x='"+x+"' y='"+(y+Math.round(idxFs*0.9))+"' font-size='"+idxFs+"' fill='"+ink+"'>"+escHtml(full)+"</text>";
    }
    ly+=rows*rowH2+8;
  }
  var legendH=ly;

  var key=quadrant?t('key_quad'):(network?t('key_net'):t('key_pi'));
  if(lens){key+=' \u00b7 '+(LANG_CUR==='en'?'values for '+t('sub_dim')+' ':'valores de la '+t('sub_dim')+' ')+term(lens);}

  // ------- composición -------
  var hasTitle=(opts.showTitle!==false)&&opts.title, hasSub=(opts.showSub!==false)&&opts.sub;
  var titleH=hasSub?92:(hasTitle?66:30), keyH=(opts.showKey?22:0), footH=opts.footOn?34:6;
  var W,H,vbx,vby,legPlace;
  if(right){
    var innerH=Math.max(bb.h,legendH);
    W=bb.w+pad*2+LW; H=innerH+pad*2+titleH+keyH+footH;
    vbx=bb.x-pad; vby=bb.y-pad-titleH;
    legPlace="<g transform='translate("+(bb.x+bb.w+34)+","+(bb.y+6)+")'>"+legSVG+"</g>";
  }else{
    W=bb.w+pad*2; H=bb.h+pad*2+titleH+legendH+keyH+footH;
    vbx=bb.x-pad; vby=bb.y-pad-titleH;
    legPlace="<g transform='translate("+bb.x+","+(bb.y+bb.h+pad+18)+")'>"+legSVG+"</g>";
  }
  var ty0=bb.y-pad-titleH, head='';
  if(hasTitle){head+="<text x='"+bb.x+"' y='"+(ty0+34)+"' font-size='27' font-weight='700' fill='"+ink+"'>"+escHtml(opts.title)+"</text>";}
  if(hasSub){head+="<text x='"+bb.x+"' y='"+(ty0+(hasTitle?58:34))+"' font-size='14.5' fill='"+mut+"'>"+escHtml(opts.sub)+"</text>";}
  var ruleW=right?(bb.w+LW):bb.w;
  head+="<line x1='"+bb.x+"' y1='"+(bb.y-pad-14)+"' x2='"+(bb.x+ruleW)+"' y2='"+(bb.y-pad-14)+"' stroke='"+line+"' stroke-width='1.4'/>";
  var ky=vby+H-footH-10;
  var keyLine=opts.showKey?("<text x='"+bb.x+"' y='"+ky+"' font-size='11.5' fill='"+soft+"'>"+escHtml(t('how_read_pre'))+": "+escHtml(key)+"</text>"):'';
  var foot='';
  if(opts.footOn){
    var fy=vby+H-12;
    var fecha='';
    if(opts.fecha){try{fecha=new Date().toLocaleDateString('es',{year:'numeric',month:'long'});}catch(e){fecha=new Date().toISOString().slice(0,10);}}
    foot="<line x1='"+bb.x+"' y1='"+(fy-16)+"' x2='"+(bb.x+ruleW)+"' y2='"+(fy-16)+"' stroke='"+line+"' stroke-width='1'/>";
    var ftxt=[]; if(opts.figura){ftxt.push(opts.figura);} if(opts.fuente){ftxt.push('Fuente: '+opts.fuente);} if(fecha){ftxt.push(fecha);}
    foot+="<text x='"+bb.x+"' y='"+fy+"' font-size='11.5' fill='"+soft+"'>"+escHtml(ftxt.join('  \u00b7  '))+"</text>";
  }
  var fam=EXP_FONTS[opts.font]||EXP_FONTS.arial;
  var bgRect=(opts.bg==='transparent')?'':("<rect x='"+vbx+"' y='"+vby+"' width='"+W+"' height='"+H+"' fill='#ffffff'/>");
  return "<svg xmlns='http://www.w3.org/2000/svg' width='"+Math.round(W)+"' height='"+Math.round(H)+"' viewBox='"+vbx+" "+vby+" "+W+" "+H+"' font-family=\""+fam+"\"><style>"+EXPORT_CSS+"</style>"+bgRect+head+inner+legPlace+keyLine+foot+"</svg>";
}
window.buildExportSVG=buildExportSVG;
window.expTab=function(name){
  var tabs=document.querySelectorAll('.mtab'); for(var i=0;i<tabs.length;i++){tabs[i].classList.toggle('active',tabs[i].getAttribute('data-tab')===name);}
  var panes=document.querySelectorAll('.mtabpane'); for(var j=0;j<panes.length;j++){panes[j].classList.toggle('hidden',panes[j].getAttribute('data-tab')!==name);}
};
function updateExpPreview(){var box=document.getElementById('expPreview'); if(!box){return;} try{box.innerHTML=buildExportSVG(collectExpOpts());}catch(e){box.textContent='\u2014';}}
window.updateExpPreview=updateExpPreview;
(function(){var back=document.getElementById('expBack'); if(back){back.addEventListener('change',updateExpPreview); back.addEventListener('input',function(e){var id=(e.target&&e.target.id)||'';if(id==='expTitle'||id==='expSubtitle'||id==='expFigura'||id==='expFuente'){updateExpPreview();}});}})();
function rasterize(opts){return new Promise(function(res,rej){
  opts=opts||collectExpOpts();
  var s=buildExportSVG(opts), blob=new Blob([s],{type:'image/svg+xml;charset=utf-8'}), url=URL.createObjectURL(blob), img=new Image();
  img.onload=function(){var sc=opts.scale||2,c=document.createElement('canvas');c.width=Math.max(1,img.width*sc);c.height=Math.max(1,img.height*sc);var ctx=c.getContext('2d');if(opts.bg!=='transparent'){ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);}ctx.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c);};
  img.onerror=function(){URL.revokeObjectURL(url);rej(new Error('img'));};
  img.src=url;
});}
window.doExport=function(kind){
  var opts=collectExpOpts();
  if(kind==='svg'){
    var b=new Blob([buildExportSVG(opts)],{type:'image/svg+xml'});
    var u=URL.createObjectURL(b);var a=document.createElement('a');a.href=u;a.download='stakeholder_map.svg';a.click();
    setTimeout(function(){URL.revokeObjectURL(u);},1000);
    window.closeExport(); flash(t('f_svg_dl')); return;
  }
  if(kind==='png'){
    rasterize(opts).then(function(c){c.toBlob(function(b){
      if(!b){flash(t('f_png_fail'));return;}
      var u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='stakeholder_map.png';a.click();
      setTimeout(function(){URL.revokeObjectURL(u);},1000);
      window.closeExport(); flash(t('f_png_dl')+' ('+opts.scale+'x'+(opts.bg==='transparent'?t('f_nobg'):'')+')');
    });}).catch(function(){flash(t('f_png_fail'));});
    return;
  }
  if(!navigator.clipboard||!window.ClipboardItem){flash(t('f_copy_na'));window.doExport('png');return;}
  rasterize(opts).then(function(c){c.toBlob(function(b){
    if(!b){window.doExport('png');return;}
    navigator.clipboard.write([new window.ClipboardItem({'image/png':b})])
      .then(function(){window.closeExport();flash(t('f_copy_ok'));})
      .catch(function(){flash(t('f_copy_fail'));window.doExport('png');});
  });}).catch(function(){window.doExport('png');});
};
window.exportPNG=function(){window.doExport('png');};
window.copyImage=function(){window.doExport('copy');};
window.downloadSVG=function(){window.doExport('svg');};
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


