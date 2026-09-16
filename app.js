const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DEFAULT={done:{},tests:{},history:[],pillarHistory:[],flexHistory:[],pillarSettings:{diaphragmLevel:1,perineumLevel:1},readiness:{energy:3,recovery:3},coachNotes:[],autoProgram:{level:2,sessionNo:1,targets:{}},
measureHistory:[{date:"09/09/2026",weight:85,waist:99,chest:108,shoulders:122,hips:98,armL:33,armR:35}]};
const state=Object.assign(DEFAULT,JSON.parse(localStorage.getItem("lafayState")||"{}"));
const save=()=>localStorage.setItem("lafayState",JSON.stringify(state));

const week=[
 ["Lun.","Souplesse A + 4 piliers","flexpill"],
 ["Mar.","Musculation 1","muscu"],
 ["Mer.","Récupération","rest"],
 ["Jeu.","Musculation 2","muscu"],
 ["Ven.","Souplesse B + 4 piliers","flexpill"],
 ["Sam.","Repos / rattrapage","rest"],
 ["Dim.","Souplesse C + 4 piliers","flexpill"]
];
const measurements=[
 ["Épaules","122 cm"],["Poitrine","108 cm"],["Taille","99 cm"],["Hanches","98 cm"],
 ["Cuisse G","58 cm"],["Cuisse D","58 cm"],["Bras G","33 cm"],["Bras D","35 cm"],
 ["Mollet G","37 cm"],["Mollet D","36,5 cm"]
];

/* Protocoles issus des notes personnelles fournies.
   Là où une note n'était pas assez précise pour automatiser sans interprétation,
   l'app affiche un guidage manuel au lieu d'inventer une cadence. */
const pillarProtocols = {
 diaphragm:{
   title:"Diaphragme", subtitle:"Respiration guidée • 10 à 15 min",
   steps:[
    {label:"Installation",sec:30,help:"Allonge-toi et relâche le corps. Prépare une respiration calme."},
    {label:"Expiration",sec:5,help:"Expire progressivement."},{label:"Récupération",sec:5,help:"Respire naturellement."},
    {label:"Expiration",sec:10,help:"Expire progressivement."},{label:"Récupération",sec:10,help:"Respire naturellement."},
    {label:"Expiration",sec:15,help:"Expire progressivement."},{label:"Récupération",sec:15,help:"Respire naturellement."},
    {label:"Expiration",sec:20,help:"Expire progressivement."},{label:"Récupération",sec:20,help:"Respire naturellement."},
    {label:"Expiration",sec:25,help:"Expire progressivement."},{label:"Récupération",sec:25,help:"Respire naturellement."},
    {label:"Expiration",sec:30,help:"Expire progressivement."},{label:"Récupération",sec:30,help:"Respire naturellement."},
    {label:"Fin",sec:10,help:"Respiration naturelle. Termine sans te relever brusquement."}
   ]
 },
 transverse:{
   title:"Transverse", subtitle:"3 × 15 • récupération 1 à 2 min",
   manual:true,
   help:"À quatre pattes : inspiration ventre relâché/gonflé, puis expiration en rentrant progressivement le ventre. Maintien bref en fin d'expiration. Fais 15 répétitions, puis valide la série.",
   sets:3,reps:15,rest:90
 },
 perineum:{
   title:"Périnée", subtitle:"Progression personnelle • récupération guidée",
   manual:true,
   help:"Effectue les contractions selon le niveau de ta fiche personnelle. La V0.2 conserve volontairement le niveau en manuel afin de ne pas inventer une cadence qui n'est pas parfaitement lisible dans tes notes.",
   sets:4,reps:12,rest:45
 },
 spine:{
   title:"Flexion arrière", subtitle:"Progressive • sans douleur",
   manual:true,
   help:"Travail progressif de flexion arrière de la colonne. Recherche une position maîtrisée et non douloureuse. L'amplitude n'est jamais un objectif à forcer.",
   sets:1,reps:1,rest:0
 }
};

function nav(id){
 $$(".page").forEach(x=>x.classList.toggle("active",x.id===id));
 $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.nav===id));
 window.scrollTo(0,0);
}
$$("[data-nav]").forEach(b=>b.onclick=()=>nav(b.dataset.nav));

function renderWeek(){
 $("#weekPlan").innerHTML=week.map((d,i)=>`<div class="day">
 <div class="day-name">${d[0]}</div><div class="day-task">${d[1]}</div>
 ${d[2]!=="rest"?`<button class="check ${state.done[i]?"done":""}" data-day="${i}">${state.done[i]?"✓":""}</button>`:"<span></span>"}
 </div>`).join("");
 $$("[data-day]").forEach(b=>b.onclick=()=>{state.done[b.dataset.day]=!state.done[b.dataset.day];save();render();});
}
function renderScores(){
 let mus=0,flex=0,pill=0;
 week.forEach((d,i)=>{if(!state.done[i])return;if(d[2]==="muscu")mus++;if(d[2]==="flexpill"){flex++;pill++;}});
 $("#muscuScore").textContent=`${mus}/2`;$("#flexScore").textContent=`${flex}/3`;$("#pillarsScore").textContent=`${pill}/3`;
}
function renderToday(){
 const idx=(new Date().getDay()+6)%7,d=week[idx],todayKey=new Date().toLocaleDateString("fr-FR");
 $("#todayLabel").textContent=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(new Date());
 $("#todayTitle").textContent=d[1];
 $("#todaySub").textContent=d[2]==="rest"?"Récupération prévue aujourd’hui.":"Ta séance prévue est prête.";
 $("#startToday").style.display=d[2]==="rest"?"none":"block";
 $("#startToday").onclick=()=>nav(d[2]==="flexpill"?"flexibility":"session");

 let tasks=[];
 if(d[2]==="muscu") tasks=[{k:"muscu",label:"Musculation",target:"séance guidée",nav:"session"}];
 else if(d[2]==="flexpill") tasks=[
   {k:"flex",label:"Souplesse",target:"~30 min",nav:"flexibility"},
   {k:"pillars",label:"4 piliers",target:"séance guidée",nav:"pillars"}
 ];
 else tasks=[{k:"rest",label:"Récupération",target:"repos prévu",nav:null}];

 const flexDone=state.flexHistory.some(x=>x.date===todayKey);
 const pillarDone=new Set(state.pillarHistory.filter(x=>x.date===todayKey).map(x=>x.key)).size>=4;
 const muscuDone=state.history.some(x=>x.date===todayKey && (x.type==="Musculation" || x.type==="Démo moteur"));
 const doneMap={flex:flexDone,pillars:pillarDone,muscu:muscuDone,rest:true};
 const doneCount=tasks.filter(t=>doneMap[t.k]).length;
 $("#todayProgressBadge").textContent=`${doneCount}/${tasks.length}`;
 $("#todayChecklist").innerHTML=tasks.map(t=>`<div class="today-task ${doneMap[t.k]?"done":""}" ${t.nav?`data-today-nav="${t.nav}"`:""}>
   <div class="today-icon">${doneMap[t.k]?"✓":"•"}</div><div><b>${t.label}</b><div class="muted small">${t.target}</div></div><span class="muted">${doneMap[t.k]?"fait":"›"}</span>
 </div>`).join("");
 $$("[data-today-nav]").forEach(x=>x.onclick=()=>nav(x.dataset.todayNav));

 const last=state.history[0];
 $("#lastActivity").innerHTML=last?`<div class="history-item"><div class="date">${last.date}</div><div class="type">${last.type}</div><div class="detail">${last.detail}</div></div>`:'<p class="muted">Aucune activité enregistrée.</p>';
}
function renderMeasurements(){
 const latest=state.measureHistory?.[state.measureHistory.length-1] || {weight:85,waist:99,chest:108,shoulders:122,hips:98,armL:33,armR:35};
 const pairs=[
  ["Épaules",latest.shoulders!=null?`${latest.shoulders} cm`:"—"],["Poitrine",latest.chest!=null?`${latest.chest} cm`:"—"],
  ["Taille",latest.waist!=null?`${latest.waist} cm`:"—"],["Hanches",latest.hips!=null?`${latest.hips} cm`:"—"],
  ["Bras G",latest.armL!=null?`${latest.armL} cm`:"—"],["Bras D",latest.armR!=null?`${latest.armR} cm`:"—"],
  ["Poids",latest.weight!=null?`${latest.weight} kg`:"—"]
 ];
 $("#measureList").innerHTML=pairs.map(m=>`<div class="measure"><span class="muted">${m[0]}</span><b>${m[1]}</b></div>`).join("");
 renderMeasureTrend();
}
function renderMeasureTrend(){
 const hist=state.measureHistory||[], latest=hist.at(-1), first=hist[0];
 if(!latest||!first){$("#measureTrend").innerHTML="";return}
 const rows=[["Poids","weight","kg"],["Taille","waist","cm"],["Poitrine","chest","cm"]];
 $("#measureTrend").innerHTML=rows.map(([label,k,u])=>{
   if(latest[k]==null||first[k]==null)return "";
   const d=+(latest[k]-first[k]).toFixed(1),cls=d<0?"down":d>0?"up":"flat",sign=d>0?"+":"";
   return `<div class="trend-row"><span>${label}</span><div><b>${latest[k]} ${u}</b> <span class="delta ${cls}">${sign}${d} ${u}</span></div></div>`;
 }).join("");
}
/* MUSCULATION V0.4
   Les tests A/B/C/A1 et les 3 min entre exercices suivent les pages du livre fournies.
   Le moteur de journalisation est générique. La séance "démo moteur" ci-dessous n'est PAS
   une prescription Lafay : elle sert uniquement à valider l'ergonomie avant le choix du programme. */
const testOrder=["A","B","C","A1"];
let tIndex=-1,tReps=0,tTimer=null,tRemaining=180,tMode="intro";

function renderStrengthHome(){
 const complete=testOrder.every(k=>Number.isFinite(Number(state.tests[k])));
 $("#testStatus").textContent=complete?"terminés ✓":"à faire";
 $("#openTests").textContent=complete?"Revoir / refaire les tests":"Lancer les tests";
 if(complete){
   $("#programDecision").innerHTML=`<div class="measure"><span>Résultats</span><b>${testOrder.map(k=>`${k} ${state.tests[k]}`).join(" · ")}</b></div>
   <p class="muted small">Les quatre tests sont enregistrés. L'application peut maintenant analyser la branche de départ documentée.</p>`;
   renderCoachDecision();
 } else {
   $("#programDecision").innerHTML='<p class="muted">Aucune prescription automatique tant que les quatre tests ne sont pas enregistrés.</p>';
   $("#coachDecision").innerHTML='<div class="coach-box"><strong>En attente des tests</strong><p class="muted small">Le compagnon ne réutilise pas tes performances de 2019 pour décider de ton niveau actuel.</p></div>';
 }
}
function level2Plan(){
 const ap=state.autoProgram||(state.autoProgram={level:2,sessionNo:1,targets:{}});
 const t=(id,base)=>Number(ap.targets[id]??base);
 return [
  {id:"B1",sets:6,target:t("B1",5),rest:25,after:25,note:"Rythme rapide : va le plus vite possible."},
  {id:"A3",sets:6,target:t("A3",5),rest:25,after:25,note:"Si 6 × 5 complets sont impossibles, utilise la demi-amplitude prévue par le livre."},
  {id:"A2",sets:6,target:t("A2",5),rest:25,after:180,note:"Si nécessaire, travaille temporairement à demi-amplitude comme indiqué page 45."},
  {id:"C1",sets:6,target:t("C1",5),rest:25,after:180,note:"Rythme rapide."},
  {id:"E jambe droite",progressKey:"E",sets:6,target:t("E",5),rest:25,after:120,note:"Commence par la jambe droite."},
  {id:"E jambe gauche",progressKey:"E",sets:6,target:t("E",5),rest:25,after:180,note:"Même objectif que la jambe droite."},
  {id:"F",sets:4,target:t("F",5),rest:25,after:180,note:"Bondis haut sans tendre violemment les jambes."},
  {id:"G",sets:6,target:t("G",10),rest:25,after:90},
  {id:"H",sets:6,target:t("H",1),rest:25,after:60},
  {id:"K2",sets:3,target:t("K2",12),rest:60,after:0,note:"Choisis l'appui pour rester dans la logique des 12 à 15 répétitions."}
 ];
}

function renderCoachDecision(){
 const b=Number(state.tests.B), box=$("#coachDecision");
 if(b>8){
   const ap=state.autoProgram||(state.autoProgram={level:2,sessionNo:1,targets:{}});
   box.innerHTML=`<div class="coach-box"><strong>Deuxième niveau débloqué ✓</strong><p>Ton résultat B (${b}) déclenche le deuxième niveau documenté. Séance automatique n°${ap.sessionNo} prête.</p><span class="source-tag">Livre vert — pages 45–47</span><span class="source-tag">Progression mémorisée</span></div><button class="primary wide" id="startAutoProgram">Démarrer ma séance</button>`;
   setTimeout(()=>{const b=$("#startAutoProgram");if(b)b.onclick=()=>openWorkout(level2Plan(),`Niveau II · séance ${ap.sessionNo}`)},0);
 } else {
   let msg="",confidence="Règle documentée";
   if(b===6 || b===7) msg="Le résultat B permet d'envisager le deuxième programme du premier niveau.";
   else if(b>4) msg="Le résultat B oriente vers le premier programme du premier niveau.";
   else {msg="Le résultat B se situe dans une branche du premier niveau dont les détails doivent être relus avant prescription automatique.";confidence="Prescription bloquée"}
   box.innerHTML=`<div class="coach-box"><strong>${confidence}</strong><p>${msg}</p><span class="source-tag">Livre vert — niveau 1</span></div>`;
 }
}

["energy","recovery"].forEach(k=>{
 const el=$("#"+k),out=$("#"+k+"Val");
 el.value=state.readiness?.[k]||3;out.textContent=`${el.value}/5`;
 el.oninput=()=>{out.textContent=`${el.value}/5`;state.readiness[k]=Number(el.value);save()};
});
$("#openTests").onclick=()=>openTests();
$("#testClose").onclick=closeTests;
$("#testPlus").onclick=()=>{tReps++;$("#testReps").textContent=tReps};
$("#testMinus").onclick=()=>{tReps=Math.max(0,tReps-1);$("#testReps").textContent=tReps};

function openTests(){
 tIndex=-1;tMode="intro";tReps=0;$("#strengthHome").style.display="none";$("#testRunner").classList.add("show");
 $("#testProgress").textContent="Échauffement";$("#testExercise").textContent="Préparation";
 $("#testHelp").textContent="Fais l'échauffement prévu : mobilisation articulaire puis mise en route progressive. Ensuite, récupère avant le premier test.";
 $("#testRepBox").style.display="none";$("#testRestClock").style.display="none";$("#testAction").textContent="Je suis prêt";
 $("#testAction").onclick=nextTest;
}
function closeTests(){clearInterval(tTimer);tTimer=null;$("#testRunner").classList.remove("show");$("#strengthHome").style.display="block";renderStrengthHome()}
function nextTest(){
 if(tMode==="rest"){clearInterval(tTimer);tTimer=null;tMode="test";}
 tIndex++;
 if(tIndex>=testOrder.length){finishTests();return}
 tMode="test";tReps=0;
 $("#testProgress").textContent=`Test ${tIndex+1} / 4`;$("#testExercise").textContent=`Exercice ${testOrder[tIndex]}`;
 $("#testHelp").textContent="Réalise une série avec une amplitude propre et enregistre le nombre de répétitions.";
 $("#testRepBox").style.display="grid";$("#testRestClock").style.display="none";$("#testReps").textContent="0";
 $("#testAction").textContent="Valider ce test";$("#testAction").onclick=validateTest;
}
function validateTest(){
 const k=testOrder[tIndex];state.tests[k]=tReps;save();
 if(tIndex===testOrder.length-1){finishTests();return}
 tMode="rest";$("#testRepBox").style.display="none";$("#testProgress").textContent="Récupération";$("#testExercise").textContent="3 minutes";
 $("#testHelp").textContent=`${k} enregistré : ${tReps} répétitions. Récupère avant le test suivant.`;
 $("#testRestClock").style.display="block";tRemaining=180;drawTestRest();$("#testAction").textContent="Pause";
 clearInterval(tTimer);tTimer=setInterval(()=>{tRemaining--;drawTestRest();if(tRemaining<=0){tRemaining=0;drawTestRest();clearInterval(tTimer);tTimer=null;buzz();$("#testAction").textContent="Exercice suivant";}},1000);
 $("#testAction").onclick=()=>{if(tTimer){clearInterval(tTimer);tTimer=null;$("#testAction").textContent="Reprendre";}else if(tRemaining<=0){tMode="test";nextTest();}else{tTimer=setInterval(()=>{tRemaining--;drawTestRest();if(tRemaining<=0){clearInterval(tTimer);tTimer=null;$("#testAction").textContent="Exercice suivant";}},1000);$("#testAction").textContent="Pause";}};
 }
function drawTestRest(){let m=Math.floor(tRemaining/60),s=tRemaining%60;$("#testRestClock").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function finishTests(){
 clearInterval(tTimer);tTimer=null;const date=new Date().toLocaleDateString("fr-FR");
 state.history.unshift({date,type:"Tests initiaux",detail:testOrder.map(k=>`${k}:${state.tests[k]??"-"}`).join(" · ")});save();
 $("#testProgress").textContent="Terminé";$("#testExercise").textContent="Tests enregistrés ✓";
 $("#testHelp").textContent="Ces résultats serviront à choisir ton point de départ actuel.";$("#testRepBox").style.display="none";$("#testRestClock").style.display="none";
 $("#testAction").textContent="Retour musculation";$("#testAction").onclick=closeTests;
}

/* Moteur générique de séance.
   La démo utilise des exercices neutres et n'est pas une prescription. */
const demoWorkout=[
 {id:"Démo 1",sets:3,target:5,rest:25},{id:"Démo 2",sets:3,target:5,rest:25},{id:"Démo 3",sets:3,target:5,rest:25}
];
let wPlan=[],wEx=0,wSet=0,wReps=0,wResults=[],wTimer=null,wRemaining=0,wFeedback={difficulty:3,tech:"clean",pain:"none"};
$("#demoWorkout").onclick=()=>openWorkout(demoWorkout,"Prévisualisation");
$("#workoutClose").onclick=closeWorkout;
$("#workoutPlus").onclick=()=>{wReps++;$("#workoutReps").textContent=wReps};
$("#workoutMinus").onclick=()=>{wReps=Math.max(0,wReps-1);$("#workoutReps").textContent=wReps};

function openWorkout(plan,title){
 wPlan=plan;wEx=0;wSet=0;wReps=plan[0].target;wResults=[];
 $("#strengthHome").style.display="none";$("#workoutRunner").classList.add("show");$("#workoutTitle").textContent=title;
 $("#workoutSummary").style.display="none";renderWorkoutSet();
}
function closeWorkout(){clearInterval(wTimer);wTimer=null;$("#workoutRunner").classList.remove("show");$("#strengthHome").style.display="block";renderStrengthHome()}
function renderWorkoutSet(){
 const e=wPlan[wEx];$("#workoutFeedback").style.display="none";$(".runner-card").style.display="";
 $("#workoutProgress").textContent=`Exercice ${wEx+1}/${wPlan.length} · Série ${wSet+1}/${e.sets}`;
 $("#workoutExercise").textContent=e.id;$("#workoutTarget").textContent=`Objectif : ${e.target} répétitions${e.note?` · ${e.note}`:""}`;
 $("#workoutClock").textContent="";$("#workoutRepEntry").style.display="grid";wReps=e.target;$("#workoutReps").textContent=wReps;
 $("#workoutAction").textContent="Valider la série";$("#workoutAction").onclick=validateWorkoutSet;
}
function validateWorkoutSet(){
 const e=wPlan[wEx];let er=wResults.find(x=>x.id===e.id);if(!er){er={id:e.id,target:e.target,series:[]};wResults.push(er)}er.series.push(wReps);
 if(wSet<e.sets-1){wSet++;startWorkoutRest(e.rest)}else showWorkoutFeedback();
}
function startWorkoutRest(sec){
 $("#workoutRepEntry").style.display="none";wRemaining=sec;drawWorkoutClock();$("#workoutAction").textContent="Passer la récupération";
 clearInterval(wTimer);wTimer=setInterval(()=>{wRemaining--;drawWorkoutClock();if(wRemaining<=0){clearInterval(wTimer);wTimer=null;buzz();renderWorkoutSet()}},1000);
 $("#workoutAction").onclick=()=>{clearInterval(wTimer);wTimer=null;renderWorkoutSet()};
}
function drawWorkoutClock(){let m=Math.floor(wRemaining/60),s=wRemaining%60;$("#workoutClock").textContent=`Récupération ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function showWorkoutFeedback(){
 $(".runner-card").style.display="none";$("#workoutFeedback").style.display="block";wFeedback={difficulty:3,tech:"clean",pain:"none"};
 $("#difficulty").value=3;$("#difficultyValue").textContent="3/5";
 $$("[data-tech]").forEach(x=>x.classList.toggle("selected",x.dataset.tech==="clean"));
 $$("[data-pain]").forEach(x=>x.classList.toggle("selected",x.dataset.pain==="none"));
}
$("#difficulty").oninput=e=>{$("#difficultyValue").textContent=`${e.target.value}/5`;wFeedback.difficulty=Number(e.target.value)};
$$("[data-tech]").forEach(b=>b.onclick=()=>{wFeedback.tech=b.dataset.tech;$$("[data-tech]").forEach(x=>x.classList.toggle("selected",x===b))});
$$("[data-pain]").forEach(b=>b.onclick=()=>{wFeedback.pain=b.dataset.pain;$$("[data-pain]").forEach(x=>x.classList.toggle("selected",x===b))});
$("#feedbackValidate").onclick=()=>{
 Object.assign(wResults[wResults.length-1],wFeedback);
 if(wEx<wPlan.length-1){
   const pause=wPlan[wEx].after||0; wEx++;wSet=0;
   if(pause>0) startBetweenExerciseRest(pause); else renderWorkoutSet();
 }else finishWorkout();
};
function startBetweenExerciseRest(sec){
 $("#workoutFeedback").style.display="none";$(".runner-card").style.display="";$("#workoutRepEntry").style.display="none";
 $("#workoutExercise").textContent="Récupération";$("#workoutTarget").textContent=`Prochain exercice : ${wPlan[wEx].id}`;
 wRemaining=sec;drawWorkoutClock();$("#workoutAction").textContent="Passer la récupération";
 clearInterval(wTimer);wTimer=setInterval(()=>{wRemaining--;drawWorkoutClock();if(wRemaining<=0){clearInterval(wTimer);wTimer=null;buzz();renderWorkoutSet()}},1000);
 $("#workoutAction").onclick=()=>{clearInterval(wTimer);wTimer=null;renderWorkoutSet()};
}
function finishWorkout(){
 const date=new Date().toLocaleDateString("fr-FR");
 const total=wResults.reduce((s,e)=>s+e.series.reduce((a,b)=>a+b,0),0);
 const avg=wResults.length?(wResults.reduce((s,e)=>s+(e.difficulty||0),0)/wResults.length).toFixed(1):"-";
 const pain=wResults.filter(e=>e.pain==="pain").length, discomfort=wResults.filter(e=>e.pain==="discomfort").length;
 const clean=wResults.filter(e=>e.tech==="clean").length;
 const isLevel2=wPlan.some(e=>e.id==="B1") && wPlan.some(e=>e.id==="K2");
 if(isLevel2){
   const ap=state.autoProgram||(state.autoProgram={level:2,sessionNo:1,targets:{}});
   const grouped={};
   wResults.forEach(r=>{const e=wPlan.find(x=>x.id===r.id),k=e?.progressKey||r.id;(grouped[k]||(grouped[k]=[])).push(r)});
   Object.entries(grouped).forEach(([k,rows])=>{
     const cur=Number(ap.targets[k]??wPlan.find(e=>(e.progressKey||e.id)===k)?.target??1);
     const ok=rows.every(r=>r.pain!=="pain" && r.tech==="clean" && r.series.every(v=>v>=cur));
     if(ok){let cap=12;if(k==="G")cap=12;if(k==="K2")cap=15;ap.targets[k]=Math.min(cap,cur+1)}else ap.targets[k]=cur;
   });
   ap.sessionNo=(ap.sessionNo||1)+1;
 }
 state.history.unshift({date,type:isLevel2?"Musculation":"Démo moteur",detail:isLevel2?`Niveau II · ${wPlan.length} blocs · ${total} reps · diff ${avg}/5`:`${wPlan.length} ex. · ${total} reps · diff ${avg}/5 · non prescriptif`,
   workout:{results:wResults,readiness:{...state.readiness},total,avg,pain,discomfort,clean}});
 save();
 $("#workoutFeedback").style.display="none";$("#workoutSummary").style.display="block";
 let guidance=pain>0?"Douleur signalée : aucune progression automatique ne sera proposée sur l'exercice concerné."
   :Number(avg)>=4.5?"Séance très difficile : le futur coach privilégiera maintien/analyse plutôt qu'une hausse automatique."
   :clean===wResults.length && Number(avg)<=3?"Exécution propre et difficulté modérée : profil compatible avec une progression, à confirmer sur le vrai programme."
   :"Séance à consolider avant décision.";
 $("#workoutSummary").innerHTML=`<h3>Bilan de séance ✓</h3><div class="summary-score">${total} <span class="muted" style="font-size:14px">répétitions</span></div>
 <div class="summary-grid"><div><span>Difficulté moy.</span><b>${avg}/5</b></div><div><span>Technique propre</span><b>${clean}/${wResults.length}</b></div>
 <div><span>Gêne</span><b>${discomfort}</b></div><div><span>Douleur</span><b>${pain}</b></div></div>
 <div class="coach-box"><strong>Lecture du compagnon</strong><p class="small">${guidance}</p><span class="source-tag">Adaptation 2026 — règle explicable</span></div>
 <button class="primary wide" id="finishWorkoutBtn">Retour</button>`;
 $("#finishWorkoutBtn").onclick=closeWorkout;
}

/* 4 PILIERS */
let activePillar=null, pStep=0, pSet=1, pTimer=null, pRemaining=0;
function renderPillars(){
 const doneToday = new Set(state.pillarHistory.filter(x=>x.date===new Date().toLocaleDateString("fr-FR")).map(x=>x.key));
 $("#pillarCards").innerHTML=Object.entries(pillarProtocols).map(([key,p])=>`
 <div class="card pillar">
   <div class="meta">${p.subtitle}</div><h3>${doneToday.has(key)?"✓ ":""}${p.title}</h3>
   <p class="muted">${p.help || (p.steps?.[0]?.help||"")}</p>
   <button class="primary pillar-start" data-pillar="${key}">${doneToday.has(key)?"Refaire":"Démarrer"}</button>
 </div>`).join("");
 $$(".pillar-start").forEach(b=>b.onclick=()=>openPillar(b.dataset.pillar));
}
function openPillar(key){
 activePillar=key;pStep=0;pSet=1;
 const p=pillarProtocols[key];
 $("#pillarRunner").classList.add("show");
 $("#pillarListView").style.display="none";
 $("#pillarRunTitle").textContent=p.title;
 if(p.manual) renderManualPillar(); else renderTimedPillar(false);
}
function closePillar(){
 clearInterval(pTimer);pTimer=null;$("#pillarRunner").classList.remove("show");$("#pillarListView").style.display="block";renderPillars();
}
function renderTimedPillar(running){
 const p=pillarProtocols[activePillar],s=p.steps[pStep];
 $("#pillarPhase").textContent=s.label;$("#pillarHelp").textContent=s.help;
 if(!running){pRemaining=s.sec;drawPillarTimer()}
 $("#pillarProgress").textContent=`Étape ${pStep+1} / ${p.steps.length}`;
 $("#pillarAction").textContent=running?"Pause":"Démarrer";
 $("#pillarRepControls").style.display="none";
}
function drawPillarTimer(){let m=Math.floor(pRemaining/60),s=pRemaining%60;$("#pillarClock").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function runPillarTimer(){
 if(pTimer){clearInterval(pTimer);pTimer=null;$("#pillarAction").textContent="Reprendre";return}
 $("#pillarAction").textContent="Pause";
 pTimer=setInterval(()=>{pRemaining--;drawPillarTimer();if(pRemaining<=0){clearInterval(pTimer);pTimer=null;buzz();nextPillarStep()}},1000)
}
function nextPillarStep(){
 const p=pillarProtocols[activePillar];
 if(pStep<p.steps.length-1){pStep++;renderTimedPillar(false);setTimeout(runPillarTimer,350)}
 else completePillar();
}
function renderManualPillar(){
 const p=pillarProtocols[activePillar];
 $("#pillarPhase").textContent=p.title;$("#pillarHelp").textContent=p.help;
 $("#pillarProgress").textContent=p.sets>1?`Série ${pSet} / ${p.sets}`:"Validation manuelle";
 $("#pillarClock").textContent=p.reps>1?`${p.reps} reps`:"À ton rythme";
 $("#pillarAction").textContent=p.sets>1?"Série terminée":"Terminer";
 $("#pillarRepControls").style.display="block";
}
function manualAdvance(){
 const p=pillarProtocols[activePillar];
 if(p.sets<=1){completePillar();return}
 if(pSet<p.sets){
   pSet++;
   $("#pillarProgress").textContent=`Récupération avant série ${pSet} / ${p.sets}`;
   pRemaining=p.rest;drawPillarTimer();
   $("#pillarAction").textContent="Pause";
   clearInterval(pTimer);
   pTimer=setInterval(()=>{pRemaining--;drawPillarTimer();if(pRemaining<=0){clearInterval(pTimer);pTimer=null;buzz();renderManualPillar()}},1000);
 } else completePillar();
}
function completePillar(){
 clearInterval(pTimer);pTimer=null;
 const p=pillarProtocols[activePillar],date=new Date().toLocaleDateString("fr-FR");
 state.pillarHistory.unshift({date,key:activePillar,title:p.title});
 state.history.unshift({date,type:"4 piliers",detail:p.title});
 save();
 $("#pillarPhase").textContent="Terminé ✓";$("#pillarHelp").textContent=`${p.title} enregistré dans ton historique.`;
 $("#pillarClock").textContent="✓";$("#pillarProgress").textContent="Séance enregistrée";$("#pillarAction").textContent="Fermer";
 $("#pillarAction").onclick=()=>{restorePillarAction();closePillar()};
}
function restorePillarAction(){
 $("#pillarAction").onclick=()=>{
   if(!activePillar)return;
   pillarProtocols[activePillar].manual?manualAdvance():runPillarTimer()
 };
}
restorePillarAction();
$("#pillarClose").onclick=()=>{restorePillarAction();closePillar()};


/* SOUPLESSE
   Le catalogue 1–35 et ses trois zones suivent les pages photographiées du livre.
   Les libellés restent volontairement neutres : pas de reproduction du texte ou des illustrations.
   La règle de séance (~15 exercices, ~1 min, couverture du catalogue sur la semaine)
   vient du suivi 2019 fourni. */
const flexExercises = Array.from({length:35},(_,i)=>{
 const n=i+1;
 return {id:n,zone:n<=15?"upper":n<=29?"middle":"lower",
         zoneLabel:n<=15?"Haut du corps":n<=29?"Milieu du corps":"Bas du corps"};
});
const flexPlans={
 A:[1,3,5,7,9,11,13,16,18,20,22,24,30,32,34],
 B:[2,4,6,8,10,12,14,17,19,21,23,25,31,33,35],
 C:[15,26,27,28,29,1,4,7,10,13,18,22,25,30,35]
};
let flexFilter="all",activeFlexPlan=[],flexIndex=0,flexFeel=null,flexTimer=null,flexRemaining=60;

function weekKey(d=new Date()){
 const x=new Date(d);x.setHours(0,0,0,0);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);
 return x.toISOString().slice(0,10);
}
function thisWeekFlexLogs(){const wk=weekKey();return state.flexHistory.filter(x=>x.week===wk)}
function completedFlexIds(){return new Set(thisWeekFlexLogs().flatMap(x=>x.results.filter(r=>r.feel!=="skipped").map(r=>r.id)))}
function completedFlexSessions(){return thisWeekFlexLogs().length}
function nextFlexName(){return ["A","B","C"][Math.min(completedFlexSessions(),2)]}
function buildFlexPlan(){
 const name=nextFlexName(),done=completedFlexIds(),base=flexPlans[name];
 // Prefer exercises not yet covered this week; fill to 15 from the planned session.
 const unseen=base.filter(id=>!done.has(id)), seen=base.filter(id=>done.has(id));
 return {name,ids:[...unseen,...seen].slice(0,15)};
}
function renderFlexibility(){
 const done=completedFlexIds(),logs=thisWeekFlexLogs(),pain=logs.flatMap(x=>x.results).filter(x=>x.feel==="pain").length;
 $("#flexWeekly").textContent=`${done.size}/35`;$("#flexSessions").textContent=`${Math.min(logs.length,3)}/3`;$("#flexPain").textContent=pain;
 const plan=buildFlexPlan();$("#flexNextLabel").textContent=`Séance ${plan.name}`;
 $("#flexPreview").innerHTML=`<p class="muted">15 exercices • maintien indicatif 1 minute • couverture progressive du corps.</p><div class="preview-chips">${plan.ids.map(id=>`<span class="chip">${id}</span>`).join("")}</div>`;
 $("#startFlex").onclick=()=>openFlex(plan);
 renderFlexCatalog();
}
function renderFlexCatalog(){
 const done=completedFlexIds(),list=flexExercises.filter(e=>flexFilter==="all"||e.zone===flexFilter);
 $("#flexCatalog").innerHTML=list.map(e=>`<div class="catalog-row ${done.has(e.id)?"done":""}">
 <div class="ex-number">${done.has(e.id)?"✓":e.id}</div><div><b>Exercice ${e.id}</b><div class="zone-label">${e.zoneLabel}</div></div><span class="muted">${done.has(e.id)?"fait":""}</span></div>`).join("");
}
$$(".zone-tab").forEach(b=>b.onclick=()=>{flexFilter=b.dataset.zone;$$(".zone-tab").forEach(x=>x.classList.toggle("active",x===b));renderFlexCatalog()});
function openFlex(plan){
 activeFlexPlan=plan.ids;flexIndex=0;flexFeel=null;
 $("#flexListView").style.display="none";$("#flexRunner").classList.add("show");$("#flexRunTitle").textContent=`Séance ${plan.name}`;
 renderFlexStep();
}
function closeFlex(){clearInterval(flexTimer);flexTimer=null;$("#flexRunner").classList.remove("show");$("#flexListView").style.display="block";renderFlexibility()}
function renderFlexStep(){
 clearInterval(flexTimer);flexTimer=null;flexRemaining=60;drawFlexTimer();flexFeel=null;
 $$(".feel").forEach(x=>x.classList.remove("selected"));
 const id=activeFlexPlan[flexIndex],e=flexExercises[id-1];
 $("#flexProgress").textContent=`Exercice ${flexIndex+1} / ${activeFlexPlan.length}`;
 $("#flexExercise").textContent=`Exercice ${id}`;$("#flexZone").textContent=e.zoneLabel;
 $("#flexTimerAction").textContent="Démarrer 1 min";
}
function drawFlexTimer(){let m=Math.floor(flexRemaining/60),s=flexRemaining%60;$("#flexClock").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`}
function toggleFlexTimer(){
 if(flexTimer){clearInterval(flexTimer);flexTimer=null;$("#flexTimerAction").textContent="Reprendre";return}
 $("#flexTimerAction").textContent="Pause";
 flexTimer=setInterval(()=>{flexRemaining--;drawFlexTimer();if(flexRemaining<=0){clearInterval(flexTimer);flexTimer=null;buzz();$("#flexTimerAction").textContent="Temps terminé ✓"}},1000)
}
$("#flexTimerAction").onclick=toggleFlexTimer;
let currentFlexResults=[];
$$(".feel").forEach(b=>b.onclick=()=>{flexFeel=b.dataset.feel;$$(".feel").forEach(x=>x.classList.toggle("selected",x===b));setTimeout(()=>advanceFlex(flexFeel),220)});
$("#flexSkip").onclick=()=>advanceFlex("skipped");
function advanceFlex(feel){
 clearInterval(flexTimer);flexTimer=null;
 currentFlexResults.push({id:activeFlexPlan[flexIndex],feel,duration:60-flexRemaining});
 if(flexIndex<activeFlexPlan.length-1){flexIndex++;renderFlexStep()}else finishFlex()
}
function finishFlex(){
 const name=$("#flexRunTitle").textContent.replace("Séance ",""),date=new Date().toLocaleDateString("fr-FR");
 state.flexHistory.unshift({date,week:weekKey(),name,results:[...currentFlexResults]});
 state.history.unshift({date,type:"Souplesse",detail:`Séance ${name} • ${currentFlexResults.filter(x=>x.feel!=="skipped").length}/15`});
 save();currentFlexResults=[];
 $("#flexProgress").textContent="Séance enregistrée";$("#flexExercise").textContent="Terminé ✓";$("#flexZone").textContent="Tes ressentis et les exercices couverts sont enregistrés.";$("#flexClock").textContent="✓";
 $("#flexTimerAction").textContent="Fermer";$("#flexTimerAction").onclick=()=>{closeFlex();$("#flexTimerAction").onclick=toggleFlexTimer};
}
$("#flexClose").onclick=closeFlex;

let historyFilter="all";
function normalizedHistoryType(h){
 if(h.type==="Démo moteur") return "Musculation";
 if(h.type==="Tests initiaux" || h.type==="Test") return "Tests";
 return h.type;
}
function renderHistory(){
 const list=(state.history||[]).filter(h=>historyFilter==="all"||normalizedHistoryType(h)===historyFilter);
 $("#historyCount").textContent=(state.history||[]).length;
 $("#historyFlexCount").textContent=(state.history||[]).filter(h=>normalizedHistoryType(h)==="Souplesse").length;
 $("#historyPillarCount").textContent=(state.history||[]).filter(h=>normalizedHistoryType(h)==="4 piliers").length;
 $("#history").innerHTML=list.length?list.map(h=>`<div class="history-item"><div class="date">${h.date}</div><div class="type">${h.type}</div><div class="detail">${h.detail}</div></div>`).join(""):`<p class="muted">Aucune activité pour ce filtre.</p>`;
}
$$("[data-history-filter]").forEach(b=>b.onclick=()=>{
 historyFilter=b.dataset.historyFilter;$$("[data-history-filter]").forEach(x=>x.classList.toggle("active",x===b));
 $("#historyFilterLabel").textContent=b.textContent;renderHistory();
});

$("#addMeasureBtn").onclick=()=>$("#measureModal").classList.add("show");
$("#closeMeasureModal").onclick=()=>$("#measureModal").classList.remove("show");
$("#measureModal").onclick=e=>{if(e.target.id==="measureModal")$("#measureModal").classList.remove("show")};
$("#saveMeasure").onclick=()=>{
 const val=id=>{const v=$("#"+id).value;return v===""?null:Number(v)};
 const item={date:new Date().toLocaleDateString("fr-FR"),weight:val("mWeight"),waist:val("mWaist"),chest:val("mChest"),
  shoulders:val("mShoulders"),hips:val("mHips"),armL:val("mArmL"),armR:val("mArmR")};
 const prev=state.measureHistory?.at(-1)||{};
 for(const k of ["weight","waist","chest","shoulders","hips","armL","armR"])if(item[k]==null)item[k]=prev[k]??null;
 state.measureHistory=state.measureHistory||[];state.measureHistory.push(item);
 state.history.unshift({date:item.date,type:"Mensurations",detail:`${item.weight??"-"} kg · taille ${item.waist??"-"} cm`});
 save();$("#measureModal").classList.remove("show");$$(".form-grid input").forEach(x=>x.value="");render();
};

$("#exportData").onclick=()=>{
 const payload={app:"Compagnon Lafay",version:"0.6",exportedAt:new Date().toISOString(),data:state};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`compagnon-lafay-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),500);
};
$("#importData").onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
   const raw=JSON.parse(await f.text()),incoming=raw.data||raw;
   if(!incoming || typeof incoming!=="object")throw new Error("format");
   localStorage.setItem("lafayState",JSON.stringify(incoming));location.reload();
 }catch(err){alert("Sauvegarde non reconnue.");}
};

$("#resetBtn").onclick=()=>{if(confirm("Réinitialiser les données locales ?")){localStorage.removeItem("lafayState");location.reload()}};

function render(){renderWeek();renderScores();renderToday();renderMeasurements();renderStrengthHome();renderPillars();renderFlexibility();renderHistory();drawTimer()}
render();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
