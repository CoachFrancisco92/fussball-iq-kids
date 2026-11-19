// Analyse (kein Test): Befund aus den neuen Testreihen (Meilenstein 1).
// Wie oft weicht die Bewertung bzw. die Hilfe VOR startAction (veralteter Torplan s.ai.goal) von der beim Start ab?
const E=require('/home/claude/repo/tests/helpers/load.js'); const {collect}=require('/home/claude/repo/tests/analysis/collect.js');
let n=0,stale=0,evDiff=0,hintDiff=0; const kinds={};
for(const r of collect(E)){ if(r.s.poss!=='red')continue; n++; const s=E.clone(r.s); const g0=s.ai.goal; const t=E.clone(s); E.startAction(t,{kind:'press',id:'b1'}); const g1=t.ai.goal; if(g0!==g1) stale++;
 const a=r.a; const e0=E.evaluate(E.clone(s),a).good; const u=E.clone(s); E.startAction(u,a); if(e0!==u.ep.eval.good){evDiff++; kinds[a.kind]=(kinds[a.kind]||0)+1;}
 const h0=JSON.stringify(E.hint(E.clone(s),'raum')); const v=E.clone(s); v.ai.goal=g1; const h1=JSON.stringify(E.hint(v,'raum')); if(h0!==h1) hintDiff++; }
console.log(`Verteidigungs-Entscheidungen in den 200 Abfolgen: ${n} · Torplan vor dem Start veraltet: ${stale} · Bewertung vorher ≠ beim Start: ${evDiff} ${JSON.stringify(kinds)} · Hilfe „Weg versperren“ zeigt dadurch anderen Punkt: ${hintDiff}`);
