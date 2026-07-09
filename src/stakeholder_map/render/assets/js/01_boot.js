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

