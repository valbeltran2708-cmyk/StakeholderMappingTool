function setLang(lang){
  LANG_CUR=(lang==='en')?'en':'es';
  ZONE=LANGZONE[LANG_CUR];
  document.documentElement.setAttribute('lang',LANG_CUR);
  // textos fijos
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var k=el.getAttribute('data-i18n'); if(!(k in (LANG[LANG_CUR]||{}))&&!(k in LANG.es)){return;}
    var suf=el.getAttribute('data-suffix')||'';
    // options y elementos con hijos: si es OPTION o no tiene elementos hijos, set textContent
    if(el.tagName==='OPTION'){el.textContent=t(k);}
    else if(el.children.length===0){el.textContent=t(k)+suf;}
    else {el.firstChild&&el.firstChild.nodeType===3?(el.firstChild.textContent=t(k)):(el.textContent=t(k));}
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.setAttribute('placeholder',t(el.getAttribute('data-i18n-ph')));});
  document.querySelectorAll('[data-i18n-title]').forEach(function(el){el.setAttribute('title',t(el.getAttribute('data-i18n-title')));});
  // términos de datos en leyendas y opciones (valor intacto, texto traducido)
  document.querySelectorAll('.ltxt[data-term]').forEach(function(el){el.textContent=term(el.getAttribute('data-term'));});
  document.querySelectorAll('option[data-term]').forEach(function(el){el.textContent=term(el.getAttribute('data-term'));});
  // 'cómo leer' con interpolación de datos
  var hs=document.getElementById('hSizeTxt');
  if(hs){var po=DATA.power_order||[];hs.textContent=t('size_from')+' '+(po[0]||'')+' '+t('size_inner')+' '+(po[po.length-1]||'')+' '+t('size_outer');}
  var hd=document.getElementById('hDistTxt');
  if(hd){var io=(DATA.interest_order||[]).slice().reverse().join(', ');
    hd.textContent=(LANG_CUR==='en'?'Closer to the center, higher interest. Levels: ':'Más cerca del centro, mayor interés. Niveles: ')+(io||'n/d')+'.';}
  // botones dinámicos y ficha abierta
  var qb=document.getElementById('qbtn'); if(qb){qb.textContent=quadrant?t('to_radial'):t('to_quad');}
  var lb=document.getElementById('langBtn'); if(lb){lb.textContent=(LANG_CUR==='es')?'EN':'ES';}
  if(CURSEL&&IDX[CURSEL]){showInfo(CURSEL);} else {details.innerHTML=defaultDetails();}
  buildKeyActors();
  applyLabels();
}
window.toggleLang=function(){setLang(LANG_CUR==='es'?'en':'es');};

details.innerHTML=defaultDetails(); applyEdgeColors(); window.filters(); setLang('es');
})();
