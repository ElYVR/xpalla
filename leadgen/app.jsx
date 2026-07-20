// LEADGEN frontend source. Rebuild the committed app.js after editing:
//   npx --yes -p @babel/core -p @babel/cli -p @babel/preset-react \
//     babel --presets @babel/preset-react app.jsx -o app.js

const {useState,useEffect,useRef} = React;

/* ---------- API client ---------- */
const API={
  async authState(){const r=await fetch("/api/auth-state");return r.json();},
  async setup(password){const r=await fetch("/api/setup",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});return {ok:r.ok,data:await r.json().catch(()=>({}))};},
  async login(password){const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});return {ok:r.ok};},
  async logout(){await fetch("/api/logout",{method:"POST"});},
  async status(){const r=await fetch("/api/status");return r.ok?r.json():null;},
  async settings(){const r=await fetch("/api/settings");return r.ok?(await r.json()).settings:null;},
  async saveSettings(s){const r=await fetch("/api/settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(s)});return r.ok?(await r.json()).settings:null;},
  async password(current,next){const r=await fetch("/api/password",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({current,next})});return {ok:r.ok,data:await r.json().catch(()=>({}))};},
  async leads(){const r=await fetch("/api/leads");return r.ok?((await r.json()).leads||[]):[];},
  async addLead(l){const r=await fetch("/api/leads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(l)});return r.ok?(await r.json()).lead:null;},
  async patchLead(id,patch){const r=await fetch("/api/leads/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(patch)});return r.ok?(await r.json()).lead:null;},
  async delLead(id){await fetch("/api/leads/"+id,{method:"DELETE"});},
  async addActivity(id,type,text){const r=await fetch("/api/leads/"+id+"/activity",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,text})});return r.ok?(await r.json()).lead:null;},
  async parse(raw){const r=await fetch("/api/import/parse",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({raw})});return r.ok?r.json():{candidates:[],warnings:["Parse failed"]};},
  async score(candidates){const r=await fetch("/api/import/score",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidates})});return r.ok?r.json():null;},
  async commit(candidates,sourceDetail){const r=await fetch("/api/import/commit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidates,sourceDetail})});return r.ok?r.json():null;},
  async outreach(id){const r=await fetch("/api/outreach/"+id,{method:"POST"});return r.ok?(await r.json()).outreach:null;}
};

/* ---------- helpers ---------- */
const STAGES=[
  {key:"new",label:"New",color:"#8A8894"},
  {key:"contacted",label:"Contacted",color:"#E9A13B"},
  {key:"conversation",label:"In conversation",color:"#E85D3D"},
  {key:"call_booked",label:"Call booked",color:"#5B6ABF"},
  {key:"client",label:"Client",color:"#2E7D5B"},
  {key:"not_now",label:"Not now",color:"#C3C0B6"}
];
const stageOf=k=>STAGES.find(s=>s.key===k)||STAGES[0];
const today=()=>new Date().toLocaleDateString("en-CA");
function addDaysStr(dateStr,n){const d=dateStr?new Date(dateStr+"T12:00:00"):new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString("en-CA");}
function dueClass(d){if(!d)return "";const t=today();return d<t?"overdue":d===t?"today":"";}
function fmtDate(iso){return new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric"});}
function timeAgo(iso){
  const s=(Date.now()-new Date(iso).getTime())/1000;
  if(s<90)return "just now"; if(s<3600)return Math.round(s/60)+"m ago";
  if(s<86400)return Math.round(s/3600)+"h ago"; if(s<86400*7)return Math.round(s/86400)+"d ago";
  return fmtDate(iso);
}
let _setToast=null;
function toast(t){_setToast&&_setToast(t);}
function copy(t){if(navigator.clipboard)navigator.clipboard.writeText(t||"");toast("Copied to clipboard");}
function Loading(){return <span className="loading"><i></i><i></i><i></i></span>;}
function TierBadge({tier}){return <span className={"tier "+(tier||"none")}>{tier||"–"}</span>;}

/* ============================================================
   AUTH SCREENS
   ============================================================ */
function SetupScreen({onDone}){
  const [pw,setPw]=useState(""),[pw2,setPw2]=useState(""),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  async function go(e){
    e.preventDefault();
    if(pw.length<8)return setErr("Password needs at least 8 characters.");
    if(pw!==pw2)return setErr("Passwords don't match.");
    setBusy(true);
    const r=await API.setup(pw);
    setBusy(false);
    if(r.ok)onDone(); else setErr(r.data.error==="already_setup"?"Already set up — reload and log in.":"Setup failed, try again.");
  }
  return (
    <div className="authwrap"><div className="authcard fade">
      <div className="disp" style={{fontSize:22,fontWeight:700,marginBottom:4}}>LEAD<span style={{color:"var(--spark)"}}>GEN</span></div>
      <div style={{fontSize:13.5,color:"var(--muted)",marginBottom:22}}>Welcome! Create your password to get started — this is a single-user app, just for you.</div>
      {err&&<div className="autherr">{err}</div>}
      <form onSubmit={go}>
        <div className="field"><label className="fl">Password (min 8 characters)</label><input className="tin" type="password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus/></div>
        <div className="field"><label className="fl">Confirm password</label><input className="tin" type="password" value={pw2} onChange={e=>setPw2(e.target.value)}/></div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} disabled={busy}>{busy?<Loading/>:"Create & enter"}</button>
      </form>
    </div></div>
  );
}
function LoginScreen({onDone}){
  const [pw,setPw]=useState(""),[err,setErr]=useState(""),[busy,setBusy]=useState(false);
  async function go(e){
    e.preventDefault(); setBusy(true);
    const r=await API.login(pw);
    setBusy(false);
    if(r.ok)onDone(); else setErr("Wrong password.");
  }
  return (
    <div className="authwrap"><div className="authcard fade">
      <div className="disp" style={{fontSize:22,fontWeight:700,marginBottom:4}}>LEAD<span style={{color:"var(--spark)"}}>GEN</span></div>
      <div style={{fontSize:13.5,color:"var(--muted)",marginBottom:22}}>Superpowers With AI · lead generation CRM</div>
      {err&&<div className="autherr">{err}</div>}
      <form onSubmit={go}>
        <div className="field"><label className="fl">Password</label><input className="tin" type="password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus/></div>
        <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} disabled={busy}>{busy?<Loading/>:"Log in"}</button>
      </form>
    </div></div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({leads,openLead,goTab}){
  const counts={}; STAGES.forEach(s=>counts[s.key]=0);
  leads.forEach(l=>{if(counts[l.stage]!=null)counts[l.stage]++;});
  const followups=leads.filter(l=>l.nextFollowUp&&l.stage!=="client"&&l.stage!=="not_now"&&l.nextFollowUp<=today())
    .sort((a,b)=>a.nextFollowUp<b.nextFollowUp?-1:1);
  const feed=leads.flatMap(l=>(l.activity||[]).map(a=>({lead:l,a}))).sort((x,y)=>x.a.at<y.a.at?1:-1).slice(0,15);
  return (
    <div className="fade">
      <div className="pipes" style={{marginBottom:22}}>
        {STAGES.map(s=>(
          <div key={s.key} className="pipe" onClick={()=>goTab("leads",s.key)}>
            <div className="k" style={{color:s.color}}>{counts[s.key]}</div>
            <div className="l">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid g2">
        <div className="card pad">
          <span className="eyebrow">Follow-ups due</span>
          <div className="cardtitle">Who needs you today</div>
          {followups.length===0
            ? <div className="empty" style={{minHeight:160,padding:"30px 10px"}}><div className="big">✓</div>Nothing due — you're all caught up.</div>
            : followups.map(l=>(
              <div key={l.id} className="fuprow" onClick={()=>openLead(l.id)}>
                <div>
                  <div className="lname">{l.name}</div>
                  <div className="lhead">{l.headline||l.email||stageOf(l.stage).label}</div>
                </div>
                <span className={"due "+dueClass(l.nextFollowUp)}>{l.nextFollowUp<today()?"overdue · ":""}{l.nextFollowUp}</span>
              </div>
            ))}
        </div>
        <div className="card pad">
          <span className="eyebrow">Recent activity</span>
          <div className="cardtitle">What's been happening</div>
          {feed.length===0
            ? <div className="empty" style={{minHeight:160,padding:"30px 10px"}}><div className="big">·</div>No activity yet. Import your first commenter list to get moving.</div>
            : <div className="feed">{feed.map((f,i)=>(
                <div key={i} className="feeditem">
                  <span className="when">{timeAgo(f.a.at)}</span>
                  <span className="what"><span className="who" style={{cursor:"pointer"}} onClick={()=>openLead(f.lead.id)}>{f.lead.name}</span> — {f.a.text}</span>
                </div>
              ))}</div>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LEADS LIST + DETAIL
   ============================================================ */
function LeadsView({leads,refresh,initialStage,settings}){
  const [q,setQ]=useState(""),[stage,setStage]=useState(initialStage||""),[tier,setTier]=useState(""),[sort,setSort]=useState("updated");
  const [openId,setOpenId]=useState(null),[showNew,setShowNew]=useState(false);
  useEffect(()=>{setStage(initialStage||"");},[initialStage]);
  let list=leads.filter(l=>
    (!stage||l.stage===stage) && (!tier||l.tier===tier) &&
    (!q||((l.name+" "+(l.headline||"")+" "+(l.email||"")+" "+(l.tags||[]).join(" ")).toLowerCase().includes(q.toLowerCase())))
  );
  list=list.slice().sort((a,b)=>{
    if(sort==="score")return (b.score||0)-(a.score||0);
    if(sort==="followUp")return (a.nextFollowUp||"9999")<(b.nextFollowUp||"9999")?-1:1;
    return a.updatedAt<b.updatedAt?1:-1;
  });
  const open=leads.find(l=>l.id===openId);
  return (
    <div className="fade">
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
        <input className="tin" style={{maxWidth:240}} placeholder="Search name, headline, tag…" value={q} onChange={e=>setQ(e.target.value)}/>
        <div className="chips">
          <button className={"chip"+(stage===""?" on":"")} onClick={()=>setStage("")}>All stages</button>
          {STAGES.map(s=><button key={s.key} className={"chip"+(stage===s.key?" on":"")} onClick={()=>setStage(stage===s.key?"":s.key)}>{s.label}</button>)}
        </div>
        <div className="chips">
          {["A","B","C"].map(t=><button key={t} className={"chip"+(tier===t?" on":"")} onClick={()=>setTier(tier===t?"":t)}>Tier {t}</button>)}
        </div>
        <select className="stagesel" value={sort} onChange={e=>setSort(e.target.value)} style={{marginLeft:"auto"}}>
          <option value="updated">Recently updated</option>
          <option value="score">Highest score</option>
          <option value="followUp">Next follow-up</option>
        </select>
        <button className="btn btn-primary" onClick={()=>setShowNew(true)}>+ Add lead</button>
      </div>
      {list.length===0
        ? <div className="card"><div className="empty"><div className="big">◎</div>{leads.length===0?"No leads yet. Import a commenter list or add one manually.":"Nothing matches these filters."}</div></div>
        : <div className="card" style={{overflow:"hidden"}}><div className="tablewrap"><table className="ltable">
            <thead><tr><th></th><th>Name</th><th>Headline</th><th>Score</th><th>Stage</th><th>Follow-up</th><th>Source</th></tr></thead>
            <tbody>
              {list.map(l=>(
                <tr key={l.id} className="rowlink" onClick={()=>setOpenId(l.id)}>
                  <td style={{width:36}}><TierBadge tier={l.tier}/></td>
                  <td><span className="lname">{l.name}</span>{l.email?<div className="lhead">{l.email}</div>:null}</td>
                  <td><div className="lhead">{l.headline||"—"}</div></td>
                  <td>{l.score!=null?l.score:"—"}</td>
                  <td onClick={e=>e.stopPropagation()}>
                    <select className="stagesel" value={l.stage} onChange={async e=>{await API.patchLead(l.id,{stage:e.target.value});refresh();}}>
                      {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td><span className={"due "+dueClass(l.nextFollowUp)}>{l.nextFollowUp||"—"}</span></td>
                  <td><span className="pill">{l.source==="linkedin-import"?"LinkedIn":l.source==="website"?"Website":"Manual"}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div></div>}
      {open&&<LeadDetail lead={open} refresh={refresh} onClose={()=>setOpenId(null)} settings={settings}/>}
      {showNew&&<NewLeadModal onClose={()=>setShowNew(false)} onAdded={()=>{setShowNew(false);refresh();}}/>}
    </div>
  );
}

function LeadDetail({lead,refresh,onClose,settings}){
  const [notes,setNotes]=useState(lead.notes||""),[email,setEmail]=useState(lead.email||"");
  const [followUp,setFollowUp]=useState(lead.nextFollowUp||""),[tags,setTags]=useState((lead.tags||[]).join(", "));
  const [genBusy,setGenBusy]=useState(false),[confirmDel,setConfirmDel]=useState(false);
  useEffect(()=>{setNotes(lead.notes||"");setEmail(lead.email||"");setFollowUp(lead.nextFollowUp||"");setTags((lead.tags||[]).join(", "));},[lead.id]);
  async function saveField(patch){await API.patchLead(lead.id,patch);refresh();}
  async function generate(){
    setGenBusy(true);
    const o=await API.outreach(lead.id);
    setGenBusy(false);
    if(o)refresh(); else toast("Couldn't generate — try again");
  }
  async function markSent(idx){
    const out=JSON.parse(JSON.stringify(lead.outreach));
    const t=out.touches[idx];
    t.sent=!t.sent; t.sentAt=t.sent?new Date().toISOString():null;
    const patch={outreach:out};
    if(t.sent){
      const next=out.touches[idx+1];
      if(idx===0&&lead.stage==="new")patch.stage="contacted";
      if(next)patch.nextFollowUp=addDaysStr(today(),next.daysAfterPrevious||3);
    }
    await API.patchLead(lead.id,patch);
    if(t.sent)await API.addActivity(lead.id,"dm_sent",'Sent "'+t.label+'"');
    refresh();
  }
  const activity=(lead.activity||[]).slice().reverse();
  return (
    <React.Fragment>
      <div className="overlay" onClick={onClose}></div>
      <div className="slideover">
        <div className="so-head">
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10}}><TierBadge tier={lead.tier}/><span className="so-name">{lead.name}</span></div>
            <div className="so-sub">{lead.headline||"No headline"}{lead.score!=null?" · score "+lead.score:""}</div>
          </div>
          <button className="so-close" onClick={onClose}>✕</button>
        </div>
        <div className="metarow">
          <select className="stagesel" value={lead.stage} onChange={e=>saveField({stage:e.target.value})}>
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <span className="pill">{lead.source==="linkedin-import"?"LinkedIn import":lead.source==="website"?"Website capture":"Added manually"}{lead.sourceDetail?" · "+lead.sourceDetail:""}</span>
          {lead.linkedinUrl&&<a className="pill spark" style={{textDecoration:"none"}} href={lead.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn profile ↗</a>}
        </div>
        {lead.scoreReason&&<div className="hint" style={{marginBottom:14}}>{lead.scoreReason}</div>}
        {lead.comment&&(
          <div className="field">
            <label className="fl">Their comment</label>
            <div style={{background:"#fff",border:"1px solid var(--line)",borderRadius:10,padding:"11px 14px",fontSize:13.5,color:"var(--ink-soft)",lineHeight:1.55}}>"{lead.comment}"</div>
          </div>
        )}
        <div className="grid g2" style={{gap:14}}>
          <div className="field"><label className="fl">Email</label><input className="tin" value={email} onChange={e=>setEmail(e.target.value)} onBlur={()=>{if(email!==(lead.email||""))saveField({email});}}/></div>
          <div className="field"><label className="fl">Next follow-up</label><input className="tin" type="date" value={followUp} onChange={e=>{setFollowUp(e.target.value);saveField({nextFollowUp:e.target.value||null});}}/></div>
        </div>
        <div className="field"><label className="fl">Tags (comma-separated)</label><input className="tin" value={tags} onChange={e=>setTags(e.target.value)} onBlur={()=>saveField({tags:tags.split(",").map(t=>t.trim()).filter(Boolean)})}/></div>
        <div className="field"><label className="fl">Notes</label><textarea className="tin" value={notes} onChange={e=>setNotes(e.target.value)} onBlur={()=>{if(notes!==(lead.notes||""))saveField({notes});}}/></div>

        <div className="divider"></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div><span className="eyebrow">Outreach</span><div className="cardtitle">3-touch DM sequence</div></div>
          <button className="btn btn-ghost" onClick={generate} disabled={genBusy}>{genBusy?<Loading/>:(lead.outreach?"Regenerate":"✦ Generate")}</button>
        </div>
        {!lead.outreach
          ? <div className="hint">Generate a personalized DM sequence from their comment and headline. You copy and send each message yourself — nothing is ever sent automatically.</div>
          : <div>
              {lead.outreach.source==="demo"&&<div className="hint" style={{marginBottom:10}}>Demo templates — add an ANTHROPIC_API_KEY for fully personalized drafts.</div>}
              {lead.outreach.touches.map((t,i)=>(
                <div key={i} className={"touch"+(t.sent?" sent":"")}>
                  <div className="thead">
                    <span className="tlabel">{t.label}{i>0?" · +"+(t.daysAfterPrevious||0)+"d":""}</span>
                    <div style={{display:"flex",gap:6}}>
                      <button className="copybtn" onClick={()=>copy(t.message)}>⧉ Copy</button>
                      <button className={"sentbtn"+(t.sent?" on":"")} onClick={()=>markSent(i)}>{t.sent?"✓ Sent":"Mark sent"}</button>
                    </div>
                  </div>
                  <div className="tmsg">{t.message}</div>
                </div>
              ))}
            </div>}

        <div className="divider"></div>
        <span className="eyebrow">Activity</span>
        <div className="feed" style={{marginTop:8}}>
          {activity.map((a,i)=>(
            <div key={i} className="feeditem"><span className="when">{timeAgo(a.at)}</span><span className="what">{a.text}</span></div>
          ))}
        </div>
        <div className="divider"></div>
        {!confirmDel
          ? <button className="btn btn-ghost" style={{color:"#a8452e",borderColor:"#ecc4b8"}} onClick={()=>setConfirmDel(true)}>Delete lead</button>
          : <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:13,color:"var(--ink-soft)"}}>Delete {lead.name} permanently?</span>
              <button className="btn btn-primary" style={{background:"#a8452e"}} onClick={async()=>{await API.delLead(lead.id);onClose();refresh();}}>Yes, delete</button>
              <button className="btn btn-ghost" onClick={()=>setConfirmDel(false)}>Cancel</button>
            </div>}
      </div>
    </React.Fragment>
  );
}

function NewLeadModal({onClose,onAdded}){
  const [f,setF]=useState({name:"",headline:"",linkedinUrl:"",email:"",comment:"",notes:"",sourceDetail:""});
  const [busy,setBusy]=useState(false);
  const set=(k,v)=>setF(Object.assign({},f,{[k]:v}));
  async function go(e){
    e.preventDefault();
    if(!f.name.trim())return toast("Name is required");
    setBusy(true);
    const l=await API.addLead(Object.assign({},f,{source:"manual"}));
    setBusy(false);
    if(l){toast("Lead added");onAdded();} else toast("Couldn't add lead");
  }
  return (
    <div className="modal" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modalcard">
        <div className="cardtitle" style={{marginBottom:16}}>Add a lead</div>
        <form onSubmit={go}>
          <div className="field"><label className="fl">Name *</label><input className="tin" value={f.name} onChange={e=>set("name",e.target.value)} autoFocus/></div>
          <div className="field"><label className="fl">Headline / role</label><input className="tin" value={f.headline} onChange={e=>set("headline",e.target.value)} placeholder="Founder at …"/></div>
          <div className="grid g2" style={{gap:14}}>
            <div className="field"><label className="fl">Email</label><input className="tin" value={f.email} onChange={e=>set("email",e.target.value)}/></div>
            <div className="field"><label className="fl">LinkedIn URL</label><input className="tin" value={f.linkedinUrl} onChange={e=>set("linkedinUrl",e.target.value)}/></div>
          </div>
          <div className="field"><label className="fl">How you met / their words</label><textarea className="tin" value={f.comment} onChange={e=>set("comment",e.target.value)} placeholder="Met at the Vancouver workshop — asked about AI for her studio"/></div>
          <div className="field"><label className="fl">Where from (optional)</label><input className="tin" value={f.sourceDetail} onChange={e=>set("sourceDetail",e.target.value)} placeholder="Referral from Sam / June workshop"/></div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy?<Loading/>:"Add lead"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   IMPORT WIZARD
   ============================================================ */
function ImportView({refresh,goTab}){
  const [step,setStep]=useState(1);
  const [raw,setRaw]=useState(""),[sourceDetail,setSourceDetail]=useState("");
  const [cands,setCands]=useState([]),[warnings,setWarnings]=useState([]);
  const [scoreSource,setScoreSource]=useState(null),[busy,setBusy]=useState(false);
  const [checked,setChecked]=useState({});
  const [result,setResult]=useState(null);

  async function doParse(){
    setBusy(true);
    const r=await API.parse(raw);
    setBusy(false);
    setCands(r.candidates||[]);setWarnings(r.warnings||[]);setScoreSource(null);
    const c={};(r.candidates||[]).forEach((x,i)=>c[i]=true);setChecked(c);
    if((r.candidates||[]).length)setStep(2); else toast("Couldn't find anyone in that paste — check the format");
  }
  async function doScore(){
    setBusy(true);
    const r=await API.score(cands);
    setBusy(false);
    if(r){
      setCands(r.candidates);setScoreSource(r.source);
      const c={};r.candidates.forEach((x,i)=>{c[i]=!x.duplicateOf;});setChecked(c);
    } else toast("Scoring failed — try again");
  }
  async function doCommit(){
    const chosen=cands.filter((c,i)=>checked[i]);
    if(!chosen.length)return toast("Nothing selected");
    setBusy(true);
    const r=await API.commit(chosen,sourceDetail);
    setBusy(false);
    if(r){setResult(r);setStep(3);refresh();} else toast("Import failed");
  }
  const editCand=(i,k,v)=>{const c=cands.slice();c[i]=Object.assign({},c[i],{[k]:v});setCands(c);};
  const nChecked=cands.filter((c,i)=>checked[i]).length;

  return (
    <div className="fade">
      <div className="stepbar">
        <div className={"step "+(step>1?"done":"cur")}></div>
        <div className={"step "+(step>2?"done":step===2?"cur":"")}></div>
        <div className={"step "+(step===3?"cur":"")}></div>
      </div>

      {step===1&&<div className="card pad">
        <span className="eyebrow">Step 1 · Paste</span>
        <div className="cardtitle">Paste your commenter or engagement list</div>
        <div className="hint" style={{marginBottom:14}}>From a LinkedIn post, giveaway, or event. Formats that work: one person per block (name / headline / comment, separated by blank lines), CSV with a header row, or tab-separated lines. You'll review everything before anything is saved.</div>
        <div className="field">
          <textarea className="tin" style={{minHeight:220,fontSize:13}} value={raw} onChange={e=>setRaw(e.target.value)}
            placeholder={"Jane Doe\nFounder at Bloom Coaching\nThis is exactly what I need! How do I start?\n\nSam Lee\nOwner, Lee Fitness Studio\nInterested — please send it over!"}/>
        </div>
        <div className="field"><label className="fl">Which post / giveaway is this from? (optional)</label><input className="tin" value={sourceDetail} onChange={e=>setSourceDetail(e.target.value)} placeholder="July AI-prompts giveaway"/></div>
        <button className="btn btn-primary" onClick={doParse} disabled={busy||!raw.trim()}>{busy?<Loading/>:"Parse list →"}</button>
      </div>}

      {step===2&&<div className="card pad">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div>
            <span className="eyebrow">Step 2 · Review & score</span>
            <div className="cardtitle">{cands.length} people found</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn btn-dark" onClick={doScore} disabled={busy}>{busy?<Loading/>:(scoreSource?"Re-score":"✦ Score against my ICP")}</button>
            <button className="btn btn-primary" onClick={doCommit} disabled={busy||!nChecked}>Add {nChecked} lead{nChecked===1?"":"s"} →</button>
          </div>
        </div>
        {scoreSource&&scoreSource.includes("demo")&&<div className="hint" style={{marginTop:6}}>Scored with the built-in demo scorer — add an ANTHROPIC_API_KEY for Claude scoring against your ICP.</div>}
        {warnings.length>0&&<div className="warnbox">{warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}</div>}
        <div className="tablewrap" style={{marginTop:16}}>
          <table className="ltable itable">
            <thead><tr><th></th><th>Name</th><th>Headline</th><th>Comment</th><th>Score</th><th></th></tr></thead>
            <tbody>
              {cands.map((c,i)=>(
                <tr key={i}>
                  <td style={{width:30}}><input type="checkbox" checked={!!checked[i]} onChange={e=>setChecked(Object.assign({},checked,{[i]:e.target.checked}))}/></td>
                  <td style={{minWidth:140}}><input value={c.name} onChange={e=>editCand(i,"name",e.target.value)}/></td>
                  <td style={{minWidth:180}}><input value={c.headline||""} onChange={e=>editCand(i,"headline",e.target.value)}/></td>
                  <td style={{minWidth:200}}><input value={c.comment||""} onChange={e=>editCand(i,"comment",e.target.value)}/></td>
                  <td style={{whiteSpace:"nowrap"}}>{c.tier?<span title={c.reason}><TierBadge tier={c.tier}/> {c.score}</span>:"—"}</td>
                  <td>{c.duplicateOf&&<span className="dupetag">already in CRM</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {cands.some((c,i)=>c.duplicateOf)&&<div className="hint" style={{marginTop:10}}>Rows marked "already in CRM" are unchecked by default so you don't create duplicates.</div>}
      </div>}

      {step===3&&result&&<div className="card pad" style={{textAlign:"center"}}>
        <div className="empty" style={{minHeight:200}}>
          <div className="big" style={{color:"var(--tierA)"}}>✓</div>
          <div className="cardtitle">{result.added} lead{result.added===1?"":"s"} added</div>
          <div className="hint" style={{marginBottom:18}}>{sourceDetail?'Tagged with "'+sourceDetail+'".':""} Tier A leads are your best bets — start there.</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button className="btn btn-primary" onClick={()=>goTab("leads")}>View leads</button>
            <button className="btn btn-ghost" onClick={()=>{setStep(1);setRaw("");setCands([]);setResult(null);}}>Import another list</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */
function SettingsView({status,settings,setSettings}){
  const [f,setF]=useState({calendlyUrl:"",notifyEmail:"",icp:""});
  const [pw,setPw]=useState({current:"",next:"",next2:""});
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(settings)setF({calendlyUrl:settings.calendlyUrl||"",notifyEmail:settings.notifyEmail||"",icp:settings.icp||""});},[settings]);
  async function save(){
    setBusy(true);
    const s=await API.saveSettings(f);
    setBusy(false);
    if(s){setSettings(s);toast("Settings saved");} else toast("Save failed");
  }
  async function changePw(e){
    e.preventDefault();
    if(pw.next.length<8)return toast("New password needs 8+ characters");
    if(pw.next!==pw.next2)return toast("New passwords don't match");
    const r=await API.password(pw.current,pw.next);
    if(r.ok){toast("Password changed");setPw({current:"",next:"",next2:""});}
    else toast(r.data.error==="wrong_password"?"Current password is wrong":"Change failed");
  }
  return (
    <div className="fade grid g2">
      <div className="card pad">
        <span className="eyebrow">Business</span>
        <div className="cardtitle" style={{marginBottom:16}}>Your setup</div>
        <div className="field">
          <label className="fl">Calendly booking link</label>
          <input className="tin" value={f.calendlyUrl} onChange={e=>setF(Object.assign({},f,{calendlyUrl:e.target.value}))} placeholder="https://calendly.com/you/intro-call"/>
          <div className="hint">Shown on the capture page thank-you screen and woven into Touch 3 of every outreach sequence.</div>
        </div>
        <div className="field">
          <label className="fl">Notification email</label>
          <input className="tin" value={f.notifyEmail} onChange={e=>setF(Object.assign({},f,{notifyEmail:e.target.value}))} placeholder="you@example.com"/>
          <div className="hint">Where new-lead alerts go{status&&status.email==="off"?" (email is off — add RESEND_API_KEY to the server to enable)":""}.</div>
        </div>
        <div className="field">
          <label className="fl">Ideal client profile (drives AI scoring)</label>
          <textarea className="tin" style={{minHeight:120}} value={f.icp} onChange={e=>setF(Object.assign({},f,{icp:e.target.value}))}/>
          <div className="hint">Describe who your best clients are. Every imported commenter is scored against this.</div>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy?<Loading/>:"Save settings"}</button>
        <div className="divider"></div>
        <span className="eyebrow">Share</span>
        <div style={{fontSize:13.5,color:"var(--ink-soft)",marginTop:6}}>
          Your public capture page: <a href="/capture" target="_blank" rel="noreferrer" style={{color:"var(--spark-deep)",fontWeight:600}}>{location.origin}/capture</a>
          <button className="copybtn" style={{marginLeft:8}} onClick={()=>copy(location.origin+"/capture")}>⧉ Copy</button>
        </div>
      </div>
      <div>
        <div className="card pad" style={{marginBottom:20}}>
          <span className="eyebrow">Security</span>
          <div className="cardtitle" style={{marginBottom:16}}>Change password</div>
          <form onSubmit={changePw}>
            <div className="field"><label className="fl">Current password</label><input className="tin" type="password" value={pw.current} onChange={e=>setPw(Object.assign({},pw,{current:e.target.value}))}/></div>
            <div className="grid g2" style={{gap:14}}>
              <div className="field"><label className="fl">New password</label><input className="tin" type="password" value={pw.next} onChange={e=>setPw(Object.assign({},pw,{next:e.target.value}))}/></div>
              <div className="field"><label className="fl">Confirm new</label><input className="tin" type="password" value={pw.next2} onChange={e=>setPw(Object.assign({},pw,{next2:e.target.value}))}/></div>
            </div>
            <button className="btn btn-dark">Change password</button>
          </form>
        </div>
        <div className="card pad">
          <span className="eyebrow">System</span>
          <div className="cardtitle" style={{marginBottom:12}}>Status</div>
          {status&&<div style={{fontSize:13.5,color:"var(--ink-soft)",display:"flex",flexDirection:"column",gap:8}}>
            <div><span className={"dotai"+(status.ai==="claude"?" on":"")} style={{display:"inline-block",marginRight:8}}></span>AI: {status.ai==="claude"?"Claude connected ("+status.model+")":"demo mode — heuristic scoring & template DMs"}</div>
            <div><span className={"dotai"+(status.db==="supabase"?" on":"")} style={{display:"inline-block",marginRight:8}}></span>Database: {status.db==="supabase"?"Supabase Postgres":"local JSON file"}</div>
            <div><span className={"dotai"+(status.email==="resend"?" on":"")} style={{display:"inline-block",marginRight:8}}></span>Email alerts: {status.email==="resend"?"Resend connected":"off"}</div>
            <div><span className={"dotai"+(status.calendly?" on":"")} style={{display:"inline-block",marginRight:8}}></span>Calendly: {status.calendly?"linked":"not set"}</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */
const TABS=[
  {key:"dashboard",label:"Dashboard",ic:"◧",title:"Dashboard",sub:"Your pipeline at a glance — and who to follow up with today."},
  {key:"leads",label:"Leads",ic:"◎",title:"Leads",sub:"Everyone in your pipeline. Click a lead to see details and draft outreach."},
  {key:"import",label:"Import",ic:"⇲",title:"Import & score",sub:"Paste a commenter list from a post or giveaway — review, score against your ICP, and add the keepers."},
  {key:"settings",label:"Settings",ic:"⚙",title:"Settings",sub:"Calendly link, notification email, ICP, and your password."}
];

function App({onLogout}){
  const [tab,setTab]=useState("dashboard");
  const [leads,setLeads]=useState([]);
  const [status,setStatus]=useState(null);
  const [settings,setSettings]=useState(null);
  const [stageFilter,setStageFilter]=useState("");
  const [openLeadId,setOpenLeadId]=useState(null);
  const [toastMsg,setToastMsg]=useState(null);
  useEffect(()=>{_setToast=t=>{setToastMsg(t);setTimeout(()=>setToastMsg(null),2200);};return()=>{_setToast=null;};},[]);
  const refresh=async()=>setLeads(await API.leads());
  useEffect(()=>{refresh();API.status().then(setStatus);API.settings().then(setSettings);},[]);
  function goTab(t,stage){setStageFilter(stage||"");setTab(t);}
  function openLead(id){setStageFilter("");setTab("leads");setOpenLeadId(id);}
  const cur=TABS.find(t=>t.key===tab);
  const dueCount=leads.filter(l=>l.nextFollowUp&&l.stage!=="client"&&l.stage!=="not_now"&&l.nextFollowUp<=today()).length;
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brandmark">
          <div className="name">LEAD<em>GEN</em></div>
          <div className="tag">Superpowers With AI</div>
        </div>
        <nav className="nav">
          {TABS.map(t=>(
            <button key={t.key} className={tab===t.key?"active":""} onClick={()=>goTab(t.key)}>
              <span className="ic">{t.ic}</span>{t.label}
              {t.key==="dashboard"&&dueCount>0&&<span style={{marginLeft:"auto",background:"var(--spark)",color:"#fff",borderRadius:999,fontSize:10.5,padding:"1px 7px",fontWeight:700}}>{dueCount}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          {status&&<div className="statpills">
            <div className="row"><span className={"dotai"+(status.ai==="claude"?" on":"")}></span>{status.ai==="claude"?"Claude AI":"Demo AI"}</div>
            <div className="row"><span className={"dotai"+(status.db==="supabase"?" on":"")}></span>{status.db==="supabase"?"Supabase DB":"Local file DB"}</div>
            <div className="row"><span className={"dotai"+(status.email==="resend"?" on":"")}></span>{status.email==="resend"?"Email alerts on":"Email alerts off"}</div>
          </div>}
          <button className="logoutbtn" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <div className="crumb">Superpowers With AI</div>
            <h1>{cur.title}</h1>
            <div className="sub">{cur.sub}</div>
          </div>
        </div>
        <div className="content">
          {tab==="dashboard"&&<Dashboard leads={leads} openLead={openLead} goTab={goTab}/>}
          {tab==="leads"&&<LeadsKeyed leads={leads} refresh={refresh} initialStage={stageFilter} settings={settings} openLeadId={openLeadId} clearOpen={()=>setOpenLeadId(null)}/>}
          {tab==="import"&&<ImportView refresh={refresh} goTab={goTab}/>}
          {tab==="settings"&&<SettingsView status={status} settings={settings} setSettings={setSettings}/>}
        </div>
      </main>
      {toastMsg&&<div className="toast">{toastMsg}</div>}
    </div>
  );
}

// Wrapper so dashboard click-through can open a specific lead's detail panel.
function LeadsKeyed({leads,refresh,initialStage,settings,openLeadId,clearOpen}){
  const [openId,setOpenId]=useState(openLeadId);
  useEffect(()=>{if(openLeadId){setOpenId(openLeadId);clearOpen();}},[openLeadId]);
  const open=leads.find(l=>l.id===openId);
  return (
    <React.Fragment>
      <LeadsView leads={leads} refresh={refresh} initialStage={initialStage} settings={settings}/>
      {open&&<LeadDetail lead={open} refresh={refresh} onClose={()=>setOpenId(null)} settings={settings}/>}
    </React.Fragment>
  );
}

function Root(){
  const [state,setState]=useState("loading"); // loading | setup | login | app
  useEffect(()=>{
    (async()=>{
      const a=await API.authState().catch(()=>null);
      if(!a){setState("login");return;}
      if(!a.setup){setState("setup");return;}
      const st=await API.status();
      setState(st?"app":"login");
    })();
  },[]);
  if(state==="loading")return <div className="bootscreen"><span className="disp">LEAD<em>GEN</em></span></div>;
  if(state==="setup")return <SetupScreen onDone={()=>setState("app")}/>;
  if(state==="login")return <LoginScreen onDone={()=>setState("app")}/>;
  return <App onLogout={async()=>{await API.logout();setState("login");}}/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root/>);
