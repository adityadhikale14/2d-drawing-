const $ = (id) => document.getElementById(id);

function num(id) {
  const v = parseFloat($(id).value);
  if (!Number.isFinite(v)) throw new Error(`Invalid input: ${id}`);
  return v;
}

function fmt(x, digits = 2) {
  if (!Number.isFinite(x)) return "—";
  return x.toFixed(digits);
}

function statusBadge(pass) {
  return `<span class="badge ${pass ? "pass" : "fail"}">${pass ? "PASS" : "FAIL"}</span>`;
}

function addRow(tbody, name, actual, allowable, unit = "MPa") {
  const fos = actual > 0 ? allowable / actual : NaN;
  const pass = actual <= allowable;
  const tr = document.createElement("tr");
  tr.innerHTML = `<td>${name}</td><td>${fmt(actual)} ${unit}</td><td>${fmt(allowable)} ${unit}</td><td>${fmt(fos)}</td><td>${statusBadge(pass)}</td>`;
  tbody.appendChild(tr);
  return { pass, fos, actual, allowable };
}

function calc() {
  const PkN=num("P"), d=num("d"), dp=num("dp"), t=num("t"), t1=num("t1"), D=num("D");
  const sigT=num("sigT"), tau=num("tau"), sigC=num("sigC");
  const includeBending=$("includeBending").checked, spanModel=$("spanModel").value;
  const P=PkN*1000;
  const Arod=Math.PI/4*d*d, Apin=Math.PI/4*dp*dp, netWidth=D-dp;
  const AeyeNet=netWidth*t, AforkNetTotal=2*netWidth*t1;
  const sigRod=P/Arod, tauPin=P/(2*Apin);
  const sigBearEye=P/(dp*t), sigBearFork=(P/2)/(dp*t1);
  const sigTearEye=P/AeyeNet, sigTearFork=P/AforkNetTotal;
  const tauShearEye=P/AeyeNet, tauShearFork=P/AforkNetTotal;

  let sigBendPin=NaN,L=NaN,Mmax=NaN;
  if(includeBending){
    L=spanModel==="outer"?(t+2*t1):(t+t1);
    Mmax=P*L/4;
    sigBendPin=32*Mmax/(Math.PI*Math.pow(dp,3));
  }

  const tbody=$("resultsBody"); tbody.innerHTML="";
  const summary=[];
  summary.push(addRow(tbody,"Rod in tension: σ = P / (π/4 d²)",sigRod,sigT));
  summary.push(addRow(tbody,"Pin in double shear: τ = P / (2·π/4 dₚ²)",tauPin,tau));
  summary.push(addRow(tbody,"Bearing (eye): σc = P / (dₚ·t)",sigBearEye,sigC));
  summary.push(addRow(tbody,"Bearing (each fork): σc = (P/2) / (dₚ·t₁)",sigBearFork,sigC));
  summary.push(addRow(tbody,"Tearing (single eye): σ = P / ((D−dₚ)·t)",sigTearEye,sigT));
  summary.push(addRow(tbody,"Tearing (fork, both lugs): σ = P / (2·(D−dₚ)·t₁)",sigTearFork,sigT));
  summary.push(addRow(tbody,"Shear-out (single eye): τ = P / ((D−dₚ)·t)",tauShearEye,tau));
  summary.push(addRow(tbody,"Shear-out (fork, both lugs): τ = P / (2·(D−dₚ)·t₁)",tauShearFork,tau));
  if(includeBending) summary.push(addRow(tbody,`Pin bending (model: central load; L=${fmt(L,2)} mm): σb = 32M/(π dₚ³)`,sigBendPin,sigT));

  const dMin=Math.sqrt((4*P)/(Math.PI*sigT));
  const dpMinShear=Math.sqrt((2*P)/(Math.PI*tau));
  const tMinEyeBearing=P/(dp*sigC), t1MinForkBearing=(P/2)/(dp*sigC);
  const AeyeMinT=P/sigT, AeyeMinS=P/tau, AforkMinT=P/sigT, AforkMinS=P/tau;
  const DminEyeT=dp+(P/(sigT*t)), DminEyeS=dp+(P/(tau*t));
  const tMinEyeT=P/(sigT*netWidth), tMinEyeS=P/(tau*netWidth);
  const t1MinForkT=P/(2*sigT*netWidth), t1MinForkS=P/(2*tau*netWidth);
  let dpMinBend=NaN;
  if(includeBending) dpMinBend=Math.cbrt((32*Mmax)/(Math.PI*sigT));

  const req=[];
  req.push(`<ul>
    <li><strong>Rod diameter</strong> from tension: dₘᵢₙ = ${fmt(dMin,2)} mm</li>
    <li><strong>Pin diameter</strong> from double shear: dₚ,ₘᵢₙ = ${fmt(dpMinShear,2)} mm</li>
    ${includeBending?`<li><strong>Pin diameter</strong> from bending (model selected): dₚ,ₘᵢₙ = ${fmt(dpMinBend,2)} mm</li>`:""}
    <li><strong>Eye thickness</strong> from bearing: tₘᵢₙ = ${fmt(tMinEyeBearing,2)} mm</li>
    <li><strong>Fork thickness</strong> (each) from bearing: t₁,ₘᵢₙ = ${fmt(t1MinForkBearing,2)} mm</li>
  </ul>`);
  req.push(`<div style="margin-top:10px;"><strong>Net section requirements</strong></div>
  <ul>
    <li>Eye net area required: Aₙ ≥ P/σₜ = ${fmt(AeyeMinT,2)} mm² and ≥ P/τ = ${fmt(AeyeMinS,2)} mm² (Aₙ = (D−dₚ)·t = ${fmt(AeyeNet,2)} mm²)</li>
    <li>Fork total net area required: Aₙ ≥ P/σₜ = ${fmt(AforkMinT,2)} mm² and ≥ P/τ = ${fmt(AforkMinS,2)} mm² (Aₙ = 2(D−dₚ)·t₁ = ${fmt(AforkNetTotal,2)} mm²)</li>
  </ul>`);
  req.push(`<div style="margin-top:10px;"><strong>Back-calculated dimensions (holding others fixed)</strong></div>
  <ul>
    <li>If <strong>t</strong> fixed: Dₘᵢₙ (eye, tension) = ${fmt(DminEyeT,2)} mm; Dₘᵢₙ (eye, shear) = ${fmt(DminEyeS,2)} mm</li>
    <li>If <strong>D</strong> fixed: tₘᵢₙ (eye, tension) = ${fmt(tMinEyeT,2)} mm; tₘᵢₙ (eye, shear) = ${fmt(tMinEyeS,2)} mm</li>
    <li>If <strong>D</strong> fixed: t₁,ₘᵢₙ (fork, tension) = ${fmt(t1MinForkT,2)} mm; t₁,ₘᵢₙ (fork, shear) = ${fmt(t1MinForkS,2)} mm</li>
  </ul>`);
  $("requiredBox").innerHTML=req.join("\n");

  const lines=[];
  lines.push(`Given:`);
  lines.push(`P = ${fmt(PkN,2)} kN = ${fmt(P,0)} N`);
  lines.push(`d = ${fmt(d,2)} mm, dₚ = ${fmt(dp,2)} mm, t = ${fmt(t,2)} mm, t₁ = ${fmt(t1,2)} mm, D = ${fmt(D,2)} mm`);
  lines.push(`Allowables: σₜ = ${fmt(sigT,2)} MPa, τ = ${fmt(tau,2)} MPa, σc = ${fmt(sigC,2)} MPa\n`);
  lines.push(`1) Rod in tension:`);
  lines.push(`A = (π/4)d² = ${fmt(Arod,2)} mm²`);
  lines.push(`σ = P/A = ${fmt(sigRod,2)} MPa  -> ${sigRod<=sigT?"PASS":"FAIL"}\n`);
  lines.push(`2) Pin in double shear:`);
  lines.push(`A_shear(one plane) = (π/4)dₚ² = ${fmt(Apin,2)} mm²`);
  lines.push(`τ = P / (2 A_shear) = ${fmt(tauPin,2)} MPa  -> ${tauPin<=tau?"PASS":"FAIL"}\n`);
  lines.push(`3) Bearing (crushing):`);
  lines.push(`Eye: σc = P / (dₚ·t) = ${fmt(sigBearEye,2)} MPa  -> ${sigBearEye<=sigC?"PASS":"FAIL"}`);
  lines.push(`Fork (each): σc = (P/2) / (dₚ·t₁) = ${fmt(sigBearFork,2)} MPa  -> ${sigBearFork<=sigC?"PASS":"FAIL"}\n`);
  lines.push(`4) Tearing across net section (ligament width = D − dₚ = ${fmt(netWidth,2)} mm):`);
  lines.push(`Eye net area = (D−dₚ)·t = ${fmt(AeyeNet,2)} mm² => σ = ${fmt(sigTearEye,2)} MPa -> ${sigTearEye<=sigT?"PASS":"FAIL"}`);
  lines.push(`Fork net area(total) = 2(D−dₚ)·t₁ = ${fmt(AforkNetTotal,2)} mm² => σ = ${fmt(sigTearFork,2)} MPa -> ${sigTearFork<=sigT?"PASS":"FAIL"}\n`);
  lines.push(`5) Shear-out (simplified net-area check):`);
  lines.push(`Eye: τ = ${fmt(tauShearEye,2)} MPa -> ${tauShearEye<=tau?"PASS":"FAIL"}`);
  lines.push(`Fork: τ = ${fmt(tauShearFork,2)} MPa -> ${tauShearFork<=tau?"PASS":"FAIL"}`);
  if(includeBending){
    lines.push(`\n6) Pin bending (selected model):`);
    lines.push(`Span L = ${fmt(L,2)} mm`);
    lines.push(`Mmax = P·L/4 = ${fmt(Mmax,2)} N·mm`);
    lines.push(`σb = 32M/(π dₚ³) = ${fmt(sigBendPin,2)} MPa -> ${sigBendPin<=sigT?"PASS":"FAIL"}`);
  }
  $("steps").textContent=lines.join("\n");
}

function resetToExample(){
  $("P").value=50;$("d").value=25;$("dp").value=35;$("t").value=20;$("t1").value=12;$("D").value=55;
  $("sigT").value=75;$("tau").value=50;$("sigC").value=150;$("includeBending").checked=true;$("spanModel").value="centers";
  calc();
}

$("form").addEventListener("submit",(e)=>{e.preventDefault();try{calc()}catch(err){alert(err.message)}});
$("resetExample").addEventListener("click",resetToExample);
resetToExample();
