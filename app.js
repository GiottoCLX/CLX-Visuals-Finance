/* CLX Finance – Multi-Page, mobile-ready (Supabase) */
(() => {
  // ---- Supabase
  const sb = window.supabase.createClient(
    window.__SUPABASE__.url,
    window.__SUPABASE__.anonKey
  );

  // ---- Helpers
  const qs  = (s, el=document)=>el.querySelector(s);
  const qsa = (s, el=document)=>[...el.querySelectorAll(s)];
  const esc = s => (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nextFrame = () => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const csvEsc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
  function parseCSVLine(line){ const r=[]; let c="",q=false; for(let i=0;i<line.length;i++){const ch=line[i]; if(q){ if(ch=='"'){ if(line[i+1]=='"'){c+='"';i++;} else q=false; } else c+=ch; } else { if(ch===','){r.push(c); c="";} else if(ch=='"'){q=true;} else c+=ch; } } r.push(c); return r; }

  // ===== DOM references (ALLE VORAB – verhindert TDZ-Fehler)
  const views       = qsa(".view");
  const viewTitle   = qs("#view-title");

  // Filters
  const fMonth     = qs("#f-month");
  const fAcc       = qs("#f-account");
  const fCat       = qs("#f-category");
  const search     = qs("#f-search");
  const btnRefresh = qs("#btn-refresh");
  const btnClear   = qs("#btn-clear");

  // Sidebar / Drawer
  const sidebar  = qs("#sidebar");
  const backdrop = qs("#side-backdrop");
  const btnNav   = qs("#btn-nav");

  // Auth
  const auth      = qs("#auth");
  const authEmail = qs("#auth-email");
  const authPw    = qs("#auth-password");
  const authMsg   = qs("#auth-msg");
  const btnSignup = qs("#btn-signup");
  const btnSignin = qs("#btn-signin");
  const btnSignout= qs("#btn-signout");
  const userEmail = qs("#user-email");

  // Accounts/Categories
  const txAcc   = qs("#tx-account");
  const txCat   = qs("#tx-category");
  const accList = qs("#acc-list");
  const catList = qs("#cat-list");

  // Transactions
  const txBody     = qs("#tx-table tbody");
  const txBodyDash = qs("#tx-table-dash tbody");
  const pagePrev   = qs("#page-prev");
  const pageNext   = qs("#page-next");
  const pageInfo   = qs("#page-info");
  const pageSizeSel= qs("#page-size");

  // Budgets
  const bMonth  = qs("#b-month");
  const bCat    = qs("#b-category");
  const bAmount = qs("#b-amount");
  const bForm   = qs("#budget-form");
  const bList   = qs("#budget-list");
  const bHint   = qs("#budgets-hint");

  // Recurring
  const rStart     = qs("#r-start");
  const rEvery     = qs("#r-every");
  const rDesc      = qs("#r-desc");
  const rAmount    = qs("#r-amount");
  const rAcc       = qs("#r-account");
  const rCat       = qs("#r-category");
  const btnRecSave = qs("#btn-rec-save");
  const btnRecApply= qs("#btn-rec-apply");
  const recList    = qs("#rec-list");
  const recHint    = qs("#rec-hint");

  // Settings
  const settingsEmail = qs("#settings-email");
  const btnLight      = qs("#theme-light");
  const btnDark       = qs("#theme-dark");
  const selCur        = qs("#currency");

  // KPIs
  const kpiIncome  = qs("#kpi-income");
  const kpiExpense = qs("#kpi-expense");
  const kpiBalance = qs("#kpi-balance");
  const kpiCount   = qs("#kpi-count");

  // ===== Mobile Drawer
  function openSidebar(){ if(!sidebar||!backdrop) return; sidebar.classList.add("open"); backdrop.style.display="block"; }
  function closeSidebar(){ if(!sidebar||!backdrop) return; sidebar.classList.remove("open"); backdrop.style.display="none"; }
  btnNav?.addEventListener("click", ()=> sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
  backdrop?.addEventListener("click", closeSidebar);

  // ===== Router (Hash)
  function setActiveByHash(hash){
    qsa(".side-btn[data-go]").forEach(a=>{
      const ok = ("#" + a.dataset.go) === hash;
      a.classList.toggle("active", ok);
      if (ok) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current");
    });
  }
  function showView(id){
    views.forEach(v => v.classList.toggle("show", v.id === id));
    setActiveByHash("#"+id);

    viewTitle.textContent = ({
      "view-dash":"Dashboard",
      "view-tx":"Transaktionen",
      "view-charts":"Berichte",
      "view-cats":"Konten & Kategorien",
      "view-budgets":"Budgets",
      "view-recurring":"Wiederkehrend",
      "view-settings":"Einstellungen",
      "view-help":"Hilfe"
    })[id] || "CLX Finance";

    if (id==="view-dash") reloadAll();
    if (id==="view-tx")   loadTransactions();
    if (id==="view-charts") refreshCharts(true);
    if (id==="view-cats") { loadAccounts(); loadCategories(); }
    if (id==="view-budgets") loadBudgets();
    if (id==="view-recurring") loadRecurring();
    if (id==="view-settings") refreshSettings();

    closeSidebar();
  }
  function route(){
    const hash = location.hash || "#view-dash";
    const id = hash.slice(1);
    if (document.getElementById(id)) showView(id); else showView("view-dash");
  }
  window.addEventListener("hashchange", route);

  // ===== Filter
  qsa(".chip[data-qf]").forEach(ch=>ch.onclick=()=>applyQuickFilter(ch.dataset.qf));
  btnRefresh?.addEventListener("click", reloadAll);
  btnClear?.addEventListener("click", ()=>{ fMonth.value=""; fAcc.value=""; fCat.value=""; search.value=""; delete search.dataset.range; reloadAll(); });

  function setDefaultDates(){
    const d=new Date();
    if(fMonth) fMonth.value=d.toISOString().slice(0,7);
    const df=qs('input[name="date"]'); if(df) df.value=d.toISOString().slice(0,10);
  }
  function applyQuickFilter(k){
    const now=new Date(), end=new Date();
    if(k==="this_month"){ fMonth.value=now.toISOString().slice(0,7); delete search.dataset.range; }
    if(k==="last_month"){ now.setMonth(now.getMonth()-1); fMonth.value=now.toISOString().slice(0,7); delete search.dataset.range; }
    if(k==="7d"){ fMonth.value=""; const s=new Date(); s.setDate(end.getDate()-6); search.dataset.range=`${s.toISOString().slice(0,10)},${end.toISOString().slice(0,10)}`; }
    if(k==="all"){ fMonth.value=""; delete search.dataset.range; }
    reloadAll();
  }

  // ===== Auth
  function setAuthMsg(t=""){ if(authMsg) authMsg.textContent=t; }
  btnSignup?.addEventListener("click", async ()=>{ setAuthMsg(); const {error}=await sb.auth.signUp({email:authEmail.value,password:authPw.value}); if(error) setAuthMsg(error.message); else setAuthMsg("Registriert. Evtl. E-Mail bestätigen."); });
  btnSignin?.addEventListener("click", async ()=>{ setAuthMsg(); const {error}=await sb.auth.signInWithPassword({email:authEmail.value,password:authPw.value}); if(error) setAuthMsg(error.message); });
  btnSignout?.addEventListener("click", async ()=>{ await sb.auth.signOut(); });

  sb.auth.onAuthStateChange(async (_e, session) => {
    const user = session?.user || null;
    if (!user){ auth?.classList.add("show"); if(userEmail) userEmail.textContent=""; if(btnSignout) btnSignout.style.display="none"; return; }
    auth?.classList.remove("show"); if(userEmail) userEmail.textContent=user.email; if(btnSignout) btnSignout.style.display="inline-block";
    await ensureDefaults(user.id);
    setDefaultDates();
    await Promise.all([loadAccounts(), loadCategories()]);
    reloadAll();
  });
  (async()=>{ const {data:{session}}=await sb.auth.getSession(); if(session?.user){ auth?.classList.remove("show"); if(userEmail) userEmail.textContent=session.user.email; if(btnSignout) btnSignout.style.display="inline-block"; await ensureDefaults(session.user.id); setDefaultDates(); await Promise.all([loadAccounts(), loadCategories()]); reloadAll(); } else { auth?.classList.add("show"); } })();

  // ===== Accounts/Categories
  async function ensureDefaults(user_id){
    const {data:a}=await sb.from("accounts").select("id").limit(1);
    if(!a||!a.length) await sb.from("accounts").insert([{user_id,name:"Bargeld"},{user_id,name:"Bank"}]);
    const {data:c}=await sb.from("categories").select("id").limit(1);
    if(!c||!c.length) await sb.from("categories").insert([{user_id,name:"Essen"},{user_id,name:"Transport"},{user_id,name:"Lohn"},{user_id,name:"Allgemein"}]);
  }
  async function loadAccounts(){
    const {data}=await sb.from("accounts").select("id,name").order("name");
    if(txAcc) txAcc.innerHTML=(data||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
    if(fAcc)  fAcc.innerHTML = `<option value="">Alle</option>`+(data||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
    if(accList) accList.innerHTML=(data||[]).map(d=>`<li>${esc(d.name)} <button class="btn btn-secondary" data-del-acc="${d.id}">Löschen</button></li>`).join("");
    const rAcc=qs("#r-account"); if(rAcc && txAcc) rAcc.innerHTML = txAcc.innerHTML;
  }
  async function loadCategories(){
    const {data}=await sb.from("categories").select("id,name").order("name");
    if(txCat) txCat.innerHTML=(data||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
    if(fCat)  fCat.innerHTML = `<option value="">Alle</option>`+(data||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
    if(catList) catList.innerHTML=(data||[]).map(d=>`<li>${esc(d.name)} <button class="btn btn-secondary" data-del-cat="${d.id}">Löschen</button></li>`).join("");
    const bCat=qs("#b-category"); if(bCat) bCat.innerHTML=(data||[]).map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("");
    const rCat=qs("#r-category"); if(rCat && txCat) rCat.innerHTML = txCat.innerHTML;
  }
  document.addEventListener("click", async (e)=>{
    const a=e.target?.getAttribute?.("data-del-acc");
    const c=e.target?.getAttribute?.("data-del-cat");
    if(a){ if(!confirm("Konto löschen?"))return; await sb.from("accounts").delete().eq("id",a); await Promise.all([loadAccounts(), reloadAll()]); }
    if(c){ if(!confirm("Kategorie löschen?"))return; await sb.from("categories").delete().eq("id",c); await Promise.all([loadCategories(), reloadAll()]); }
  });
  qs("#acc-form")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const name=new FormData(e.target).get("name").toString().trim();
    const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id; if(!name) return;
    const {error}=await sb.from("accounts").insert({user_id,name}); if(error) return alert(error.message);
    e.target.reset(); loadAccounts();
  });
  qs("#cat-form")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const name=new FormData(e.target).get("name").toString().trim();
    const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id; if(!name) return;
    const {error}=await sb.from("categories").insert({user_id,name}); if(error) return alert(error.message);
    e.target.reset(); loadCategories();
  });

  // ===== Transactions
  let rowsCache=[], sort={key:"date",dir:"desc"}, page=1, pageSize=parseInt(pageSizeSel?.value||"50",10);
  pagePrev?.addEventListener("click", ()=>{ if(page>1){ page--; renderTable(); } });
  pageNext?.addEventListener("click", ()=>{ const max=Math.max(1,Math.ceil(rowsCache.length/pageSize)); if(page<max){ page++; renderTable(); } });
  pageSizeSel?.addEventListener("change", ()=>{ pageSize=parseInt(pageSizeSel.value,10)||50; page=1; renderTable(); });
  qsa("#tx-table thead th[data-sort]").forEach(th=>th.addEventListener("click",()=>{ const k=th.getAttribute("data-sort"); if(sort.key===k) sort.dir=sort.dir==="asc"?"desc":"asc"; else { sort.key=k; sort.dir="asc"; } renderTable(); }));

  function baseQuery(){
    let q=sb.from("transactions").select("id,date,description,amount,is_income,account_id,category_id,created_at,accounts(name),categories(name)");
    if(fMonth?.value){ const s=new Date(fMonth.value+"-01"), e=new Date(s); e.setMonth(e.getMonth()+1); q=q.gte("date",s.toISOString().slice(0,10)).lt("date",e.toISOString().slice(0,10)); }
    else if (search?.dataset.range){ const [s,e]=search.dataset.range.split(","); q=q.gte("date",s).lte("date",e); }
    if(fAcc?.value) q=q.eq("account_id",fAcc.value);
    if(fCat?.value) q=q.eq("category_id",fCat.value);
    if(search?.value.trim()) q=q.ilike("description",`%${search.value.trim()}%`);
    return q;
  }
  async function loadTransactions(){
    const {data,error}=await baseQuery().order("date",{ascending:false}).order("created_at",{ascending:false});
    if(error){console.error(error); return;}
    rowsCache=data||[]; page=1; renderTable(); renderRecentDash();
  }
  function getKey(r,k){ if(k==="amount") return r.amount*(r.is_income?1:-1); if(k==="type") return r.is_income?1:0; if(k==="account") return (r.accounts?.name||"").toLowerCase(); if(k==="category") return (r.categories?.name||"").toLowerCase(); return (r[k]||""); }
  function renderTable(){
    if(!txBody) return;
    const arr=[...rowsCache].sort((a,b)=>{const va=getKey(a,sort.key), vb=getKey(b,sort.key); if(va<vb) return sort.dir==="asc"?-1:1; if(va>vb) return sort.dir==="asc"?1:-1; return 0;});
    let bal=0; const start=(page-1)*pageSize; const rows=arr.slice(start,start+pageSize);
    txBody.innerHTML=rows.map(r=>{ const net=r.is_income?+r.amount:-r.amount; bal+=net; return `<tr><td>${r.date}</td><td>${esc(r.description||"")}</td><td>${esc(r.accounts?.name||"—")}</td><td>${esc(r.categories?.name||"—")}</td><td class="num">${r.is_income?"Ein":"Aus"}</td><td class="num">${net.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td class="num">${bal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td class="num"><button class="btn btn-secondary" data-del="${r.id}">×</button></td></tr>`; }).join("");
    const max=Math.max(1,Math.ceil(rowsCache.length/pageSize)); if(pageInfo) pageInfo.textContent=`Seite ${page}/${max} – ${rowsCache.length} Einträge`;
  }
  document.addEventListener("click", async (e)=>{
    const id=e.target?.getAttribute?.("data-del"); if(!id) return;
    if(!confirm("Transaktion löschen?")) return;
    await sb.from("transactions").delete().eq("id",id);
    reloadAll();
  });

  // Create tx
  const txForm=qs("#tx-form"), btnReset=qs("#btn-reset");
  txForm?.addEventListener("submit", async e=>{
    e.preventDefault();
    const f=new FormData(txForm);
    const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id;
    const row={user_id,date:f.get("date"),description:f.get("description").toString().trim(),amount:parseFloat(f.get("amount")),is_income:f.get("type")==="income",account_id:f.get("account_id")||null,category_id:f.get("category_id")||null};
    const {error}=await sb.from("transactions").insert(row);
    if(error) return alert(error.message);
    txForm.reset(); setDefaultDates(); reloadAll();
  });
  btnReset?.addEventListener("click", ()=>{ txForm.reset(); setDefaultDates(); });

  // Export / Import
  qs("#btn-export")?.addEventListener("click", async ()=>{
    const {data}=await sb.from("transactions").select("date,description,amount,is_income,accounts(name),categories(name)").order("date",{ascending:true});
    const lines=["date,description,amount,is_income,account,category"];
    (data||[]).forEach(r=>lines.push([r.date,csvEsc(r.description||""),r.amount,r.is_income?1:0,csvEsc(r.accounts?.name||""),csvEsc(r.categories?.name||"")].join(",")));
    const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="transactions.csv"; a.click();
  });
  qs("#file-import")?.addEventListener("change", async e=>{
    const file=e.target.files?.[0]; if(!file) return;
    const text=await file.text(); const rows=text.split(/\r?\n/).filter(Boolean);
    const header=rows.shift().split(","); const idx=Object.fromEntries(header.map((h,i)=>[h.trim(),i]));
    const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id;
    const accMap=await getNameIdMap("accounts"); const catMap=await getNameIdMap("categories");
    const batch=[];
    for(const line of rows){
      const cols=parseCSVLine(line);
      const account_id=await nameToId("accounts",cols[idx.account]||"",accMap,user_id);
      const category_id=await nameToId("categories",cols[idx.category]||"",catMap,user_id);
      batch.push({user_id,date:cols[idx.date],description:cols[idx.description],amount:parseFloat(cols[idx.amount]||"0"),is_income:(cols[idx.is_income]==="1"||cols[idx.is_income]==="true"),account_id,category_id});
    }
    for(let i=0;i<batch.length;i+=200){
      const {error}=await sb.from("transactions").insert(batch.slice(i,i+200));
      if(error) return alert(error.message);
    }
    alert("Import abgeschlossen."); reloadAll();
  });
  async function getNameIdMap(t){ const {data}=await sb.from(t).select("id,name"); const m=new Map(); (data||[]).forEach(r=>m.set(r.name,r.id)); return m; }
  async function nameToId(t,name,map,user_id){ if(!name) return null; if(map.has(name)) return map.get(name); const {data}=await sb.from(t).insert({user_id,name}).select("id").single(); map.set(name,data.id); return data.id; }

  // ===== KPIs + Charts + Sidebar
  async function refreshKPIs(){
    const {data}=await baseQuery().select("amount,is_income");
    let inc=0,exp=0; (data||[]).forEach(r=>{ if(r.is_income) inc+=+r.amount; else exp+=+r.amount; });
    if(kpiIncome) kpiIncome.textContent=inc.toFixed(2);
    if(kpiExpense) kpiExpense.textContent=exp.toFixed(2);
    if(kpiBalance) kpiBalance.textContent=(inc-exp).toFixed(2);
    if(kpiCount) kpiCount.textContent=(data||[]).length.toString();
  }
  let chart1, chart2, chart3, chart4;
  async function refreshCharts(forChartsPage=false){
    const {data}=await baseQuery().select("date,amount,is_income,category_id,categories(name)");
    const byDay=new Map(), byCat=new Map();
    (data||[]).forEach(r=>{ const net=r.is_income?+r.amount:-r.amount; byDay.set(r.date,(byDay.get(r.date)||0)+net); if(!r.is_income){ const c=r.categories?.name||"—"; byCat.set(c,(byCat.get(c)||0)+(+r.amount)); }});
    const labels=[...byDay.keys()].sort(); const values=labels.map(k=>byDay.get(k));
    const cLabels=[...byCat.keys()], cValues=cLabels.map(k=>byCat.get(k));
    await nextFrame();
    if (chart1) chart1.destroy(); if (chart2) chart2.destroy();
    const ctx1=qs("#chart-balance")?.getContext("2d"); const ctx2=qs("#chart-cats")?.getContext("2d");
    if (ctx1) chart1=new Chart(ctx1,{type:"bar",data:{labels,datasets:[{label:"Netto pro Tag",data:values}]},options:{responsive:true,maintainAspectRatio:false}});
    if (ctx2) chart2=new Chart(ctx2,{type:"doughnut",data:{labels:cLabels,datasets:[{label:"Ausgaben",data:cValues}]},options:{responsive:true,maintainAspectRatio:false}});
    if (forChartsPage){
      if (chart3) chart3.destroy(); if (chart4) chart4.destroy();
      const x1=qs("#chart-balance-2")?.getContext("2d"); const x2=qs("#chart-cats-2")?.getContext("2d");
      if (x1) chart3=new Chart(x1,{type:"line",data:{labels,datasets:[{label:"Netto pro Tag",data:values}]},options:{responsive:true,maintainAspectRatio:false}});
      if (x2) chart4=new Chart(x2,{type:"pie",data:{labels:cLabels,datasets:[{label:"Ausgaben",data:cValues}]},options:{responsive:true,maintainAspectRatio:false}});
    }
  }
  async function refreshSidebars(){
    const now=new Date(), s=new Date(); s.setDate(now.getDate()-30);
    const {data:recent}=await sb.from("transactions").select("date,description,amount,is_income").gte("date",s.toISOString().slice(0,10)).lte("date",now.toISOString().slice(0,10)).order("date",{ascending:false}).limit(6);
    const recentList=qs("#recent-list");
    if (recentList) recentList.innerHTML=(recent||[]).map(r=>`<li><span>${esc(r.description||"—")} <span class="muted">(${r.date})</span></span><strong style="color:${r.is_income?'var(--good)':'var(--bad)'}">${(r.is_income?'+':'-')}${(+r.amount).toFixed(2)}</strong></li>`).join("")||`<li class="muted">Keine Einträge</li>`;
    try{
      const {data:recs}=await sb.from("recurring").select("description,amount,is_income").limit(6);
      const schedule=qs("#schedule-list");
      if(schedule) schedule.innerHTML=(recs||[]).map(r=>`<li><span>${esc(r.description||"—")}</span><strong style="color:${r.is_income?'var(--good)':'var(--bad)'}">${(r.is_income?'+':'-')}${(+r.amount).toFixed(2)}</strong></li>`).join("")||`<li class="muted">Keine geplanten Zahlungen</li>`;
    } catch {}
  }
  async function refreshAccountCard(){
    let accountId=fAcc?.value;
    if(!accountId){
      const {data:first}=await sb.from("accounts").select("id,name").order("name").limit(1);
      accountId=first?.[0]?.id||null;
      const n=qs("#cc-name"); if(n) n.textContent=first?.[0]?.name||"—";
    } else {
      const {data:a}=await sb.from("accounts").select("name").eq("id",accountId).single();
      const n=qs("#cc-name"); if(n) n.textContent=a?.name||"—";
    }
    const funds=qs("#cc-funds");
    if(!accountId){ if(funds) funds.textContent="CHF 0.00"; return; }
    const {data}=await sb.from("transactions").select("amount,is_income").eq("account_id",accountId);
    let bal=0; (data||[]).forEach(r=>bal += r.is_income?+r.amount:-r.amount);
    if(funds) funds.textContent="CHF "+bal.toFixed(2);
  }
  async function renderRecentDash(){
    if(!txBodyDash) return;
    const rows=rowsCache.slice(0,6);
    txBodyDash.innerHTML=(rows||[]).map(r=>`<tr><td>${r.date}</td><td>${esc(r.description||"")}</td><td class="num" style="color:${r.is_income?'var(--good)':'var(--bad)'}">${(r.is_income?'+':'-')}${(+r.amount).toFixed(2)}</td></tr>`).join("")||`<tr><td colspan="3" class="muted">Keine Einträge</td></tr>`;
  }
  async function reloadAll(){ await Promise.all([loadTransactions(), refreshKPIs(), refreshCharts(), refreshSidebars(), refreshAccountCard()]); }

  // ===== Budgets
  bForm?.addEventListener("submit", async e=>{
    e.preventDefault();
    try{
      const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id;
      const month=bMonth.value||new Date().toISOString().slice(0,7);
      const category_id=bCat.value; const amount=parseFloat(bAmount.value||"0");
      const {error}=await sb.from("budgets").upsert({user_id,month,category_id,amount},{onConflict:"user_id,month,category_id"});
      if(error) throw error;
      loadBudgets();
    }catch{ alert("Budgets nicht verfügbar. Bitte schema.sql ausführen."); }
  });
  async function loadBudgets(){
    try{
      const month=bMonth.value||new Date().toISOString().slice(0,7); bMonth.value=month;
      const {data:buds}=await sb.from("budgets").select("id,month,category_id,amount,categories(name)").eq("month",month).order("amount",{ascending:false});
      const s=new Date(month+"-01"), e=new Date(s); e.setMonth(e.getMonth()+1);
      const {data:tx}=await sb.from("transactions").select("amount,is_income,category_id").gte("date",s.toISOString().slice(0,10)).lt("date",e.toISOString().slice(0,10));
      const spent=new Map(); (tx||[]).forEach(r=>{ if(r.is_income) return; spent.set(r.category_id,(spent.get(r.category_id)||0)+(+r.amount)); });
      bList.innerHTML=(buds||[]).map(b=>{ const used=spent.get(b.category_id)||0; const pct=Math.min(100, Math.round((used/Math.max(1,b.amount))*100)); return `<li><span>${esc(b.categories?.name||"—")}</span><span>${used.toFixed(0)} / ${b.amount.toFixed(0)} CHF · ${pct}%</span></li>`; }).join("");
      bHint.textContent = (buds?.length? "" : "Noch keine Budgets – oben hinzufügen.");
    }catch{ if(bHint) bHint.textContent="Budgets-Tab benötigt schema.sql"; }
  }

  // ===== Recurring
  btnRecSave?.addEventListener("click", async ()=>{
    try{
      const {data:ses}=await sb.auth.getUser(); const user_id=ses?.user?.id;
      const row={user_id,start_date:rStart.value,every:rEvery.value,description:rDesc.value,amount:parseFloat(rAmount.value||"0"),is_income:false,account_id:rAcc.value||null,category_id:rCat.value||null};
      const {error}=await sb.from("recurring").insert(row); if(error) throw error;
      loadRecurring();
    }catch{ alert("Recurring nicht verfügbar (schema.sql ausführen)."); }
  });
  btnRecApply?.addEventListener("click", async ()=>{
    try{
      const month=(fMonth?.value||new Date().toISOString().slice(0,7));
      const s=new Date(month+"-01"); const e=new Date(s); e.setMonth(e.getMonth()+1);
      const {data:ses}=await sb.auth.getUser();
      const {data:recs}=await sb.from("recurring").select("*");
      const ins=[];
      for(const r of recs||[]){
        if(r.every==="monthly"){
          ins.push({user_id:ses.user.id,date:s.toISOString().slice(0,10),description:r.description,amount:r.amount,is_income:r.is_income,account_id:r.account_id,category_id:r.category_id});
        } else {
          let cur=new Date(s);
          while(cur<e){
            ins.push({user_id:ses.user.id,date:cur.toISOString().slice(0,10),description:r.description,amount:r.amount,is_income:r.is_income,account_id:r.account_id,category_id:r.category_id});
            cur.setDate(cur.getDate()+7);
          }
        }
      }
      for(let i=0;i<ins.length;i+=200) await sb.from("transactions").insert(ins.slice(i,i+200));
      alert("Wiederkehrende Transaktionen hinzugefügt.");
      reloadAll();
    }catch{ alert("Recurring nicht verfügbar (schema.sql ausführen)."); }
  });
  async function loadRecurring(){
    try{
      const {data}=await sb.from("recurring").select("id,every,description,amount,is_income,accounts(name),categories(name)");
      if(recList) recList.innerHTML=(data||[]).map(r=>`<li>${esc(r.description||"")} · ${r.every} <span>${(r.is_income?'+':'-')}${(+r.amount).toFixed(2)}</span> <button class="btn btn-secondary" data-del-rec="${r.id}">Löschen</button></li>`).join("")||`<li class="muted">Noch keine Einträge</li>`;
      recHint.textContent="";
    }catch{ if(recHint) recHint.textContent="Recurring-Tab benötigt schema.sql"; }
  }
  document.addEventListener("click", async (e)=>{
    const id=e.target?.getAttribute?.("data-del-rec"); if(!id) return;
    if(!confirm("Wiederkehrenden Eintrag löschen?")) return;
    await sb.from("recurring").delete().eq("id",id);
    loadRecurring();
  });

  // ===== Settings
  function refreshSettings(){ if(settingsEmail) settingsEmail.textContent = userEmail?.textContent || "—"; const cur=localStorage.getItem("clx.currency")||"CHF"; if(selCur) selCur.value=cur; }
  btnLight?.addEventListener("click", ()=>{ document.body.classList.remove("theme-dark"); localStorage.setItem("clx.theme","light"); });
  btnDark?.addEventListener("click", ()=>{ document.body.classList.add("theme-dark"); localStorage.setItem("clx.theme","dark"); });
  selCur?.addEventListener("change", ()=>localStorage.setItem("clx.currency", selCur.value));
  (()=>{ const t=localStorage.getItem("clx.theme"); if(t==="dark") document.body.classList.add("theme-dark"); const c=localStorage.getItem("clx.currency")||"CHF"; if(selCur) selCur.value=c; })();

  // ===== Start (erst NACH allen Referenzen)
  route();
})();
