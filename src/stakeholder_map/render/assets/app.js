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
var bands=document.getElementById('ringBands');
var ringLabels=document.getElementById('ringLabels');
var hint=document.getElementById('focusHint');
var NI=DATA.NI||1, NP=DATA.NP||1;
var IDX={}, NODE_EL={}, CHILDREN={}, DEG={}, SUPPORT={}, LPOS={};
DATA.nodes.forEach(function(n){IDX[n.id]=n; if(n.parent_id){(CHILDREN[n.parent_id]=CHILDREN[n.parent_id]||[]).push(n);}});
DATA.edges.forEach(function(e){DEG[e.source]=(DEG[e.source]||0)+1;DEG[e.target]=(DEG[e.target]||0)+1;
  var s=e.pol==='pos'?1:(e.pol==='neg'?-1:0); SUPPORT[e.target]=(SUPPORT[e.target]||0)+s*(parseInt(e.strength,10)||0);});

var LANG={
 es:{
  app_title:'Mapa de Stakeholders \u00b7 Poder\u2013Inter\u00e9s y Relaciones',
  nodes:'nodos',edges_lbl:'relaciones',view:'Vista',filters:'Filtros',key_actors:'Actores clave',
  how_read:'C\u00f3mo leer',legends:'Leyendas',export:'Exportar',validation:'Validaci\u00f3n',
  v_pi:'Poder\u2013inter\u00e9s',v_net:'Conexiones',v_quad:'Cuadrante',
  c_edges:'Relaciones',c_subs:'Subdivisiones',c_rings:'Anillos de inter\u00e9s',c_pol:'Color por efecto (polaridad)',
  spread:'Separaci\u00f3n de anillos',band_colors:'Colores de anillos (radial)',zone_colors:'Colores de cuadrantes',
  f_sphere:'Esfera',f_dim:'Dimensi\u00f3n',f_reltype:'Tipo de relaci\u00f3n',all_f:'Todas',all_consol:'Todas (consolidado)',
  dim_hint:'Elegir una dimensi\u00f3n reposiciona y redimensiona cada actor seg\u00fan su puntaje en ella.',
  k_score:'Inter\u00e9s + poder',k_deg:'Conexiones',k_isolate:'Mostrar solo estos en el mapa',
  h_size:'Tama\u00f1o del c\u00edrculo = poder',h_dist:'Distancia al centro = inter\u00e9s',
  h_border:'Borde = dimensi\u00f3n',h_border_txt:'L\u00ednea punteada = subdivisi\u00f3n. Click en una entidad abre su mapa local.',
  h_views:'Vistas',h_views_txt:'Poder\u2013inter\u00e9s: posici\u00f3n por inter\u00e9s y tama\u00f1o por poder. Conexiones: distribuye por relaciones, c\u00edrculos iguales. Cuadrante: matriz de Mendelow, c\u00edrculos de igual tama\u00f1o (la posici\u00f3n ya codifica inter\u00e9s y poder).',
  l_spheres:'Esferas',l_dims:'Dimensiones (borde)',l_rels:'Relaciones',l_effect:'Efecto (color por polaridad)',
  l_pos:'Apoya / positiva',l_neg:'Se opone / negativa',l_neu:'Neutral',
  btn_report_img:'Imagen para reporte\u2026',csv_strategy:'CSV estrategia',csv_nodes:'CSV nodos',csv_edges:'CSV relaciones',
  export_hint:'La imagen exporta lo que est\u00e1 visible en el mapa (filtros incluidos); el di\u00e1logo controla formato, etiquetas, color, leyenda y pie de figura.',
  sheet_nodes:'Hoja nodos',sheet_edges:'Hoja relaciones',search_ph:'Buscar stakeholder\u2026',clear:'Limpiar',close:'Cerrar',
  btn_detail:'Panel detalle',btn_legend:'Leyenda',btn_export:'Exportar\u2026',
  d_select:'Selecciona un stakeholder',d_select_txt:'Click en un nodo para resaltar sus conexiones. Si es una entidad con subdivisiones, se abre su mapa local.',
  m_title:'Imagen para reporte',m_sub:'Exporta lo visible en el mapa. Los filtros de actores se controlan en el panel izquierdo.',
  m_titlelbl:'T\u00edtulo',m_subtitle:'Subt\u00edtulo',m_labels:'Etiquetas de los c\u00edrculos',m_alias:'Alias',m_fullname:'Nombre completo',
  m_num_pre:'Numerar si supera',m_num_post:'caracteres',m_color:'Color',m_color_on:'Color',m_gray:'Escala de grises',m_font:'Tipograf\u00eda',
  m_legend:'Leyenda',m_le_esf:'Esferas',m_le_dim:'Dimensiones',m_le_rel:'Relaciones',m_le_size:'Tama\u00f1o = poder',
  m_legpos:'Posici\u00f3n de la leyenda',m_bottom:'Abajo',m_right:'Derecha',m_res:'Resoluci\u00f3n PNG',m_2x:'2x (pantalla)',m_3x:'3x (impresi\u00f3n)',
  m_bg:'Fondo',m_white:'Blanco',m_transp:'Transparente',m_reltypes:'Tipos de relaci\u00f3n a incluir en la imagen',
  m_foot:'Incluir pie de figura',m_source_ph:'Elaboraci\u00f3n propia',m_date:'Incluir fecha',m_copy:'Copiar imagen',m_dlsvg:'Descargar SVG',m_dlpng:'Descargar PNG',
  m_idx_cols:'Columnas del \u00edndice',m_idx_font:'Letra del \u00edndice (px)',m_auto:'Autom\u00e1tico',
  to_quad:'Vista cuadrante',to_radial:'Vista radial',multi_both:'En ambas dimensiones',multi_several:'En varias dimensiones',
  q_cm:'Gestionar de cerca',q_ks:'Mantener satisfecho',q_ki:'Mantener informado',q_mo:'Monitorear',
  axis_interest:'Inter\u00e9s en el proyecto',axis_power:'Poder / influencia',
  g_dimension:'Dimensi\u00f3n',g_interest:'Inter\u00e9s',g_power:'Poder',g_importance:'Importancia',g_connections:'Conexiones',
  g_support:'Apoyo (entrante)',g_by_dim:'Por dimensi\u00f3n (inter\u00e9s \u00b7 poder)',g_categories:'Categor\u00edas',g_notes:'Notas',
  g_out_rel:'Relaciones salientes',g_in_rel:'Relaciones entrantes',g_no_rel:'Sin relaciones',g_strength:'fuerza',g_strength_cap:'Fuerza',
  g_by_dim_tag:'dimensi\u00f3n',g_relationship:'Relaci\u00f3n',
  how_read_pre:'C\u00f3mo leer',
  key_pi:'tama\u00f1o = poder \u00b7 distancia al centro = inter\u00e9s \u00b7 borde = dimensi\u00f3n \u00b7 color = esfera',
  key_quad:'Cuadrante de Mendelow \u00b7 tama\u00f1o uniforme \u00b7 posici\u00f3n = inter\u00e9s (x) y poder (y)',
  key_net:'Distribuci\u00f3n por relaciones \u00b7 tama\u00f1o uniforme \u00b7 borde = dimensi\u00f3n',
  sub_consol:'consolidado',sub_multi:'solo entidades en varias dimensiones',sub_dim:'dimensi\u00f3n',
  conventions:'Convenciones',size_from:'de',size_inner:'(interior) a',size_outer:'(exterior)',
  f_hidden:'Este actor est\u00e1 oculto por los filtros actuales.',f_svg_dl:'SVG descargado',f_png_dl:'PNG descargado',
  f_nobg:', sin fondo',f_png_fail:'No se pudo generar el PNG; usa el bot\u00f3n SVG.',f_copy_ok:'Imagen copiada al portapapeles',
  f_copy_na:'Copiar no disponible aqu\u00ed; descargando PNG.',f_copy_fail:'No se pudo copiar; descargando PNG.'
 },
 en:{
  app_title:'Stakeholder Map \u00b7 Power\u2013Interest and Relationships',
  nodes:'nodes',edges_lbl:'relationships',view:'View',filters:'Filters',key_actors:'Key actors',
  how_read:'How to read',legends:'Legends',export:'Export',validation:'Validation',
  v_pi:'Power\u2013interest',v_net:'Connections',v_quad:'Quadrant',
  c_edges:'Relationships',c_subs:'Subdivisions',c_rings:'Interest rings',c_pol:'Color by effect (polarity)',
  spread:'Ring spacing',band_colors:'Ring colors (radial)',zone_colors:'Quadrant colors',
  f_sphere:'Sphere',f_dim:'Dimension',f_reltype:'Relationship type',all_f:'All',all_consol:'All (consolidated)',
  dim_hint:'Choosing a dimension repositions and resizes each actor by its score in it.',
  k_score:'Interest + power',k_deg:'Connections',k_isolate:'Show only these on the map',
  h_size:'Circle size = power',h_dist:'Distance to center = interest',
  h_border:'Border = dimension',h_border_txt:'Dotted line = subdivision. Click an entity to open its local map.',
  h_views:'Views',h_views_txt:'Power\u2013interest: position by interest and size by power. Connections: distributed by relationships, equal circles. Quadrant: Mendelow matrix, equal-size circles (position already encodes interest and power).',
  l_spheres:'Spheres',l_dims:'Dimensions (border)',l_rels:'Relationships',l_effect:'Effect (color by polarity)',
  l_pos:'Supports / positive',l_neg:'Opposes / negative',l_neu:'Neutral',
  btn_report_img:'Image for report\u2026',csv_strategy:'Strategy CSV',csv_nodes:'Nodes CSV',csv_edges:'Relationships CSV',
  export_hint:'The image exports what is visible on the map (filters included); the dialog controls format, labels, color, legend and figure caption.',
  sheet_nodes:'Nodes sheet',sheet_edges:'Relationships sheet',search_ph:'Search stakeholder\u2026',clear:'Clear',close:'Close',
  btn_detail:'Detail panel',btn_legend:'Legend',btn_export:'Export\u2026',
  d_select:'Select a stakeholder',d_select_txt:'Click a node to highlight its connections. If it is an entity with subdivisions, its local map opens.',
  m_title:'Image for report',m_sub:'Exports what is visible on the map. Actor filters are controlled in the left panel.',
  m_titlelbl:'Title',m_subtitle:'Subtitle',m_labels:'Circle labels',m_alias:'Alias',m_fullname:'Full name',
  m_num_pre:'Number if longer than',m_num_post:'characters',m_color:'Color',m_color_on:'Color',m_gray:'Grayscale',m_font:'Typography',
  m_legend:'Legend',m_le_esf:'Spheres',m_le_dim:'Dimensions',m_le_rel:'Relationships',m_le_size:'Size = power',
  m_legpos:'Legend position',m_bottom:'Bottom',m_right:'Right',m_res:'PNG resolution',m_2x:'2x (screen)',m_3x:'3x (print)',
  m_bg:'Background',m_white:'White',m_transp:'Transparent',m_reltypes:'Relationship types to include in the image',
  m_foot:'Include figure caption',m_source_ph:'Own elaboration',m_date:'Include date',m_copy:'Copy image',m_dlsvg:'Download SVG',m_dlpng:'Download PNG',
  m_idx_cols:'Index columns',m_idx_font:'Index font (px)',m_auto:'Automatic',
  to_quad:'Quadrant view',to_radial:'Radial view',multi_both:'In both dimensions',multi_several:'In several dimensions',
  q_cm:'Manage closely',q_ks:'Keep satisfied',q_ki:'Keep informed',q_mo:'Monitor',
  axis_interest:'Project interest',axis_power:'Power / influence',
  g_dimension:'Dimension',g_interest:'Interest',g_power:'Power',g_importance:'Importance',g_connections:'Connections',
  g_support:'Support (incoming)',g_by_dim:'By dimension (interest \u00b7 power)',g_categories:'Categories',g_notes:'Notes',
  g_out_rel:'Outgoing relationships',g_in_rel:'Incoming relationships',g_no_rel:'No relationships',g_strength:'strength',g_strength_cap:'Strength',
  g_by_dim_tag:'dimension',g_relationship:'Relationship',
  how_read_pre:'How to read',
  key_pi:'size = power \u00b7 distance to center = interest \u00b7 border = dimension \u00b7 color = sphere',
  key_quad:'Mendelow matrix \u00b7 uniform size \u00b7 position = interest (x) and power (y)',
  key_net:'Relationship-based layout \u00b7 uniform size \u00b7 border = dimension',
  sub_consol:'consolidated',sub_multi:'only entities in several dimensions',sub_dim:'dimension',
  conventions:'Legend of labels',size_from:'from',size_inner:'(inner) to',size_outer:'(outer)',
  f_hidden:'This actor is hidden by the current filters.',f_svg_dl:'SVG downloaded',f_png_dl:'PNG downloaded',
  f_nobg:', no background',f_png_fail:"Couldn't generate PNG; use the SVG button.",f_copy_ok:'Image copied to clipboard',
  f_copy_na:'Copy not available here; downloading PNG.',f_copy_fail:"Couldn't copy; downloading PNG."
 }
};
var LANG_CUR='es';
function t(k){var d=LANG[LANG_CUR]||LANG.es;return (k in d)?d[k]:(LANG.es[k]||k);}
var TERMS=DATA.terms||{};
function term(v){if(v==null||v===''){return v;}if(LANG_CUR==='en'&&TERMS[v]){return TERMS[v];}return v;}
function nodeLabel(n){return (LANG_CUR==='en'&&n&&n.label_en)?n.label_en:(n?n.label:'');}
function nodeAlias(n){return (LANG_CUR==='en'&&n&&n.alias_en)?n.alias_en:(n?n.alias:'');}
function nodeDesc(n){return (LANG_CUR==='en'&&n&&n.desc_en)?n.desc_en:(n?n.description:'');}
var LANGZONE={
 es:{cm:{l:'Gestionar de cerca',a:'Involucrar de forma activa: co-decisi\u00f3n y comunicaci\u00f3n frecuente.'},
     ks:{l:'Mantener satisfecho',a:'Mantener conforme: consultar en decisiones clave, sin saturar.'},
     ki:{l:'Mantener informado',a:'Informar y escuchar: aprovechar como aliado o vocero.'},
     mo:{l:'Monitorear',a:'Seguimiento ligero: reevaluar si cambia su poder o inter\u00e9s.'},
     no:{l:'Sin clasificar',a:'Falta poder o inter\u00e9s en los datos.'}},
 en:{cm:{l:'Manage closely',a:'Engage actively: co-decision and frequent communication.'},
     ks:{l:'Keep satisfied',a:'Keep on side: consult on key decisions without overloading.'},
     ki:{l:'Keep informed',a:'Inform and listen: leverage as ally or spokesperson.'},
     mo:{l:'Monitor',a:'Light follow-up: reassess if power or interest changes.'},
     no:{l:'Unclassified',a:'Power or interest missing in the data.'}}
};
var CURSEL=null;

var POLCOL={pos:'#2e9e5b',neg:'#d64545',neu:'#9aa3af'};
var ZONE=LANGZONE.es;
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
    lbl:radio('expLbl')||'alias', gray:radio('expColor')==='gray',
    font:(document.getElementById('expFont')||{}).value||'arial',
    scale:parseInt(radio('expScale')||'2',10)||2,
    bg:radio('expBg')||'white',
    pos:radio('expLegPos')||'bottom',
    legs:legs, rel:rel,
    num:!!(nm&&nm.checked), numLen:Math.max(4,parseInt((nl||{}).value||'14',10)||14),
    idxCols:(icv==='auto'?0:Math.max(1,Math.min(8,parseInt(icv,10)||0))),
    idxFont:Math.max(7,Math.min(20,parseInt((ifz||{}).value||'12',10)||12)),
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
  // etiquetas: alias (por defecto) o nombre completo
  clone.querySelectorAll('.node').forEach(function(g){
    var f=g.querySelector('.lblF');
    if(f){ if(opts.lbl==='full'){var a=g.querySelector('.lblA'); if(a){a.parentNode.removeChild(a);} f.setAttribute('class','lbl lblA'); }
           else {f.parentNode.removeChild(f);} }
  });
  // numeración de nombres largos: número en el círculo + bloque Convenciones
  var numIndex=[];
  if(opts.num){
    var cand=[];
    clone.querySelectorAll('.node:not(.hidden)').forEach(function(g){
      var n=IDX[g.getAttribute('data-id')]; if(!n){return;}
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
  var inner=clone.innerHTML;

  // ------- leyenda por bloques (abajo o a la derecha) -------
  var ink='#1f2733', mut='#5b6675', soft='#6b7480', line='#c9d0d8';
  function G(c){return opts.gray?toGray(c):c;}
  var right=(opts.pos==='right');
  // Ancho del panel derecho: crece para alojar el índice en varias columnas
  // (acotadas al alto de la figura) sin cortar nombres.
  var idxFs=opts.idxFont||12, idxCharW=idxFs*0.55, idxRowH=idxFs+8;
  var idxColsRight=1, idxNeedW=0;
  if(opts.num&&numIndex.length){
    var lc=0;
    numIndex.forEach(function(it){var L=(it.num+'. '+nodeLabel(it.n)+(nodeAlias(it.n)?(' ('+nodeAlias(it.n)+')'):'')).length; if(L>lc){lc=L;}});
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
  var LW=right?Math.max(300, Math.round(idxColsRight*idxNeedW+(idxColsRight-1)*18)+24):300;
  var legW=right?(LW-20):bb.w;
  var perRowItems=right?1:3, perRowRel=right?1:2, colW=legW/perRowItems, colWRel=legW/perRowRel;
  var legSVG='', ly=0, lx0=0, rowH=24;
  function header(txt){legSVG+="<text x='"+lx0+"' y='"+ly+"' font-size='13' font-weight='700' fill='"+mut+"'>"+escHtml(txt)+"</text>"; ly+=20;}
  function itemsN(arr,swatch,per,cw){
    arr.forEach(function(it,i){
      var col=i%per,row=Math.floor(i/per),x=lx0+col*cw,y=ly+row*rowH;
      legSVG+=swatch(x,y,it);
      legSVG+="<text x='"+(x+(it.off||24))+"' y='"+(y+12)+"' font-size='12.5' fill='"+ink+"'>"+escHtml(it.name)+"</text>";
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
    legSVG+="<text x='"+(cx0+30)+"' y='"+(cy0+4)+"' font-size='12' fill='"+soft+"'>"+escHtml(t('size_from'))+" "+escHtml(String(lo))+" "+escHtml(t('size_inner'))+" "+escHtml(String(hi))+" "+escHtml(t('size_outer'))+"</text>";
    ly+=48;
  }
  if(opts.num&&numIndex.length){
    header(t('conventions'));
    // El índice debe mostrar el nombre COMPLETO (ese es su propósito), así
    // que solo se usan dos columnas cuando la leyenda va abajo, hay bastantes
    // entradas y el ancho de cada columna alcanza para el nombre más largo.
    var longest=0;
    numIndex.forEach(function(it){var L=(it.num+'. '+nodeLabel(it.n)+(nodeAlias(it.n)?(' ('+nodeAlias(it.n)+')'):'')).length;if(L>longest){longest=L;}});
    var needW=longest*idxCharW+16, gap=18, rowH2=idxRowH, ncol;
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
    var cw=legW/ncol, rows=Math.ceil(numIndex.length/ncol);
    for(var ci=0;ci<numIndex.length;ci++){
      var it=numIndex[ci];
      var col=Math.floor(ci/rows), row=ci%rows;   // llenado por columnas
      var x=lx0+col*cw, y=ly+row*rowH2;
      var full=it.num+'. '+nodeLabel(it.n)+(nodeAlias(it.n)?(' ('+nodeAlias(it.n)+')'):'');
      legSVG+="<text x='"+x+"' y='"+(y+Math.round(idxFs*0.9))+"' font-size='"+idxFs+"' fill='"+ink+"'>"+escHtml(full)+"</text>";
    }
    ly+=rows*rowH2+8;
  }
  var legendH=ly;

  var key=quadrant?t('key_quad'):(network?t('key_net'):t('key_pi'));
  if(lens){key+=' \u00b7 '+(LANG_CUR==='en'?'values for '+t('sub_dim')+' ':'valores de la '+t('sub_dim')+' ')+term(lens);}

  // ------- composición -------
  var titleH=(opts.sub?92:66), keyH=22, footH=opts.footOn?34:6;
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
  var head="<text x='"+bb.x+"' y='"+(bb.y-pad-titleH+34)+"' font-size='27' font-weight='700' fill='"+ink+"'>"+escHtml(opts.title)+"</text>";
  if(opts.sub){head+="<text x='"+bb.x+"' y='"+(bb.y-pad-titleH+58)+"' font-size='14.5' fill='"+mut+"'>"+escHtml(opts.sub)+"</text>";}
  var ruleW=right?(bb.w+LW):bb.w;
  head+="<line x1='"+bb.x+"' y1='"+(bb.y-pad-14)+"' x2='"+(bb.x+ruleW)+"' y2='"+(bb.y-pad-14)+"' stroke='"+line+"' stroke-width='1.4'/>";
  var ky=vby+H-footH-10;
  var keyLine="<text x='"+bb.x+"' y='"+ky+"' font-size='11.5' fill='"+soft+"'>"+escHtml(t('how_read_pre'))+": "+escHtml(key)+"</text>";
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


// ---- idioma ES/EN ----
window.setBandColor=function(lvl,color){
  document.querySelectorAll('#ringBands circle[data-lvl="'+lvl+'"]').forEach(function(c){c.setAttribute('fill',color);});
};
window.setZoneColor=function(zone,color){
  document.querySelectorAll('.qzone[data-zone="'+zone+'"]').forEach(function(r){r.setAttribute('fill',color);});
};
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
}
window.toggleLang=function(){setLang(LANG_CUR==='es'?'en':'es');};

details.innerHTML=defaultDetails(); applyEdgeColors(); window.filters(); setLang('es');
})();
