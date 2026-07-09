// ---- idioma ES/EN ----
var qColorMode='zone';
var labelMode='alias';   // etiqueta en el mapa vivo: 'alias' o 'full'
function applyLabels(){
  var want;
  if(labelMode==='full'){ want=(LANG_CUR==='en')?['lblFen','lblF','lblAen','lblA']:['lblF','lblA']; }
  else { want=(LANG_CUR==='en')?['lblAen','lblA']:['lblA']; }
  document.querySelectorAll('.node').forEach(function(g){
    var groups=g.querySelectorAll('.lbl'); if(!groups.length){return;}
    var chosen=null;
    for(var i=0;i<want.length&&!chosen;i++){var el=g.querySelector('.'+want[i]); if(el){chosen=el;}}
    if(!chosen){chosen=groups[0];}
    groups.forEach(function(x){x.style.display=(x===chosen)?'inline':'none';});
  });
}
window.setLabelMode=function(m){
  labelMode=(m==='full')?'full':'alias';
  document.querySelectorAll('.lblmode').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-lm')===labelMode);});
  applyLabels();
};
function _swBg(el,color){ if(el){el.setAttribute('data-color',color); el.style.background=color;} }
window.setBandColor=function(lvl,color){
  document.querySelectorAll('#ringBands circle[data-lvl="'+lvl+'"]').forEach(function(c){c.setAttribute('fill',color);});
  _swBg(document.querySelector('.bandC[data-lvl="'+lvl+'"]'),color);
};
window.setZoneColor=function(zone,color){
  document.querySelectorAll('.qcell[data-zone="'+zone+'"]').forEach(function(r){
    r.setAttribute('fill',color);
    _swBg(document.querySelector('.cellC[data-col="'+r.getAttribute('data-col')+'"][data-row="'+r.getAttribute('data-row')+'"]'),color);
  });
  _swBg(document.querySelector('.zoneC[data-zone="'+zone+'"]'),color);
};
window.setCellColor=function(col,row,color){
  var r=document.querySelector('.qcell[data-col="'+col+'"][data-row="'+row+'"]');
  if(r){r.setAttribute('fill',color);}
  _swBg(document.querySelector('.cellC[data-col="'+col+'"][data-row="'+row+'"]'),color);
};
window.setQColorMode=function(m){
  qColorMode=(m==='cell')?'cell':'zone';
  var zp=document.getElementById('qzonePick'), cp=document.getElementById('qcellPick');
  if(zp){zp.classList.toggle('hidden',qColorMode!=='zone');}
  if(cp){cp.classList.toggle('hidden',qColorMode!=='cell');}
  document.querySelectorAll('.qcm').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-m')===qColorMode);});
  document.querySelectorAll('.qcell').forEach(function(c){c.classList.toggle('clickable',qColorMode==='cell');});
  if(qColorMode!=='cell'){closeColorPop();}
};

// ---- selector de color propio: popover in-page, sin diálogo nativo del SO ----
// (el <input type=color> nativo dejaba la página inerte en visores embebidos)
var PALETTE=['#ffffff','#f2f2f2','#d9d9d9','#bfbfbf','#808080','#404040','#000000',
 '#fbe0e0','#f4a3a3','#d64545','#fdece0','#f6b26b','#e69138','#fff7d6',
 '#ffe066','#f1c232','#e6f2d9','#a9d18e','#38761d','#dfeaf5','#9dc3e6',
 '#1f4e79','#ede1f6','#b4a7d6','#674ea7','#d9f2ee','#76c7bd','#0e7c86'];
var _popApply=null;
function closeColorPop(){var p=document.getElementById('colorPop'); if(p){p.classList.add('hidden');} _popApply=null;}
function renderPalette(){
  var g=document.getElementById('paletteGrid'); if(!g||g.childNodes.length){return;}
  PALETTE.forEach(function(c){
    var b=document.createElement('button'); b.type='button'; b.className='sw'; b.style.background=c; b.title=c;
    b.addEventListener('click',function(){ if(_popApply){_popApply(c);} closeColorPop(); });
    g.appendChild(b);
  });
}
function openColorPop(rect,current){
  var p=document.getElementById('colorPop'); if(!p){return;}
  renderPalette();
  var hx=document.getElementById('hexIn'); if(hx){hx.value=(current||'#ffffff').replace(/^#/,'');}
  p.classList.remove('hidden');
  var pw=p.offsetWidth||184, ph=p.offsetHeight||160, m=8;
  var x=rect.right+6, y=rect.top;
  if(x+pw>window.innerWidth-m){x=Math.max(m,rect.left-pw-6);}
  if(y+ph>window.innerHeight-m){y=Math.max(m,window.innerHeight-ph-m);}
  p.style.left=x+'px'; p.style.top=y+'px';
}
window.openSwatch=function(btn){
  var kind=btn.getAttribute('data-kind');
  _popApply=function(color){
    if(kind==='band'){window.setBandColor(btn.getAttribute('data-lvl'),color);}
    else if(kind==='zone'){window.setZoneColor(btn.getAttribute('data-zone'),color);}
    else if(kind==='cell'){window.setCellColor(btn.getAttribute('data-col'),btn.getAttribute('data-row'),color);}
  };
  openColorPop(btn.getBoundingClientRect(), btn.getAttribute('data-color'));
};
window.applyHex=function(){
  var hx=document.getElementById('hexIn'); if(!hx){return;}
  var v=hx.value.trim().replace(/^#/,'');
  if(/^[0-9a-fA-F]{3}$/.test(v)){v=v.replace(/(.)/g,'$1$1');}
  if(/^[0-9a-fA-F]{6}$/.test(v)){ if(_popApply){_popApply('#'+v.toLowerCase());} closeColorPop(); }
};
document.querySelectorAll('.qcell').forEach(function(cell){
  cell.addEventListener('click',function(e){
    if(qColorMode!=='cell'||!quadrant){return;}
    e.stopPropagation();
    _popApply=function(color){ window.setCellColor(cell.getAttribute('data-col'),cell.getAttribute('data-row'),color); };
    openColorPop(cell.getBoundingClientRect(), cell.getAttribute('fill')||'#ffffff');
  });
});
document.addEventListener('mousedown',function(e){
  var p=document.getElementById('colorPop');
  if(!p||p.classList.contains('hidden')){return;}
  if(p.contains(e.target)||(e.target.classList&&e.target.classList.contains('swatch'))){return;}
  closeColorPop();
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape'){closeColorPop();} });
