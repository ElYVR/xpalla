// LEADGEN — Superpowers With AI lead generation CRM (single-user).
// Zero external dependencies (Node built-ins only). Run: node leadgen/server.js
//
// Storage: uses SUPABASE Postgres (via its REST API) when SUPABASE_URL +
// SUPABASE_SERVICE_KEY are set; otherwise falls back to a local JSON file so
// the app always runs. Auth (scrypt + session cookie) is unchanged either way.
//
// Config via environment OR a local leadgen/.env file (see .env.example).

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 4179;
const DBFILE = path.join(ROOT, 'leadgen-db.json');

/* ---------- minimal .env loader (no dependency) ---------- */
try {
  fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  });
} catch (e) {}

const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Leadgen <onboarding@resend.dev>';
const SEED_PASSWORD = process.env.LEADGEN_PASSWORD || '';
// Treat unfilled .env.example placeholders as "not configured".
const SB_PLACEHOLDER = /YOUR-|YOUR_|example\.supabase/i;
const USE_SB = !!(SB_URL.startsWith('http') && SB_KEY && !SB_PLACEHOLDER.test(SB_URL) && !SB_PLACEHOLDER.test(SB_KEY));
const TYPES = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml' };

const STAGES = ['new','contacted','conversation','call_booked','client','not_now'];

/* ============================================================
   STORAGE ABSTRACTION — same interface, two backends.
   ============================================================ */
function makeJsonStore(){
  let db;
  try{ db=JSON.parse(fs.readFileSync(DBFILE,'utf8')); }
  catch(e){ try{ db=JSON.parse(fs.readFileSync(path.join(ROOT,'seed-db.json'),'utf8')); }catch(e2){ db={}; } }
  db.settings=db.settings||null; db.sessions=db.sessions||{}; db.leads=db.leads||[];
  const save=()=>{ try{ fs.writeFileSync(DBFILE, JSON.stringify(db,null,2)); }catch(e){} };
  return {
    kind:'json',
    async getSettings(){ return db.settings; },
    async saveSettings(s){ db.settings=s; save(); },
    async createSession(token,exp){ db.sessions[token]={exp}; save(); },
    async getSession(token){ return db.sessions[token]||null; },
    async deleteSession(token){ delete db.sessions[token]; save(); },
    async listLeads(){ return db.leads; },
    async getLead(id){ return db.leads.find(l=>l.id===id)||null; },
    async addLead(l){ db.leads.unshift(l); save(); return l; },
    async addLeads(ls){ db.leads.unshift(...ls); save(); return ls; },
    async updateLead(id,lead){ const i=db.leads.findIndex(l=>l.id===id); if(i<0)return null; db.leads[i]=lead; save(); return lead; },
    async deleteLead(id){ db.leads=db.leads.filter(l=>l.id!==id); save(); }
  };
}

function makeSupabaseStore(){
  const base = SB_URL + '/rest/v1';
  const H = { apikey:SB_KEY, Authorization:'Bearer '+SB_KEY, 'content-type':'application/json' };
  const enc = encodeURIComponent;
  async function q(pathQ, opts){
    const r = await fetch(base+pathQ, Object.assign({headers:H}, opts||{}));
    const t = await r.text(); let j=null; try{ j=t?JSON.parse(t):null; }catch(e){}
    if(!r.ok) throw new Error('supabase '+r.status+': '+t);
    return j;
  }
  const minimal = Object.assign({}, H, {Prefer:'return=minimal'});
  const upsert = Object.assign({}, H, {Prefer:'resolution=merge-duplicates,return=minimal'});
  return {
    kind:'supabase',
    async getSettings(){ const a=await q('/leadgen_settings?select=data&id=eq.owner'); return a&&a[0]?a[0].data:null; },
    async saveSettings(s){ await q('/leadgen_settings?on_conflict=id',{method:'POST',headers:upsert,body:JSON.stringify({id:'owner',data:s})}); },
    async createSession(token,exp){ await q('/leadgen_sessions',{method:'POST',headers:minimal,body:JSON.stringify({token,exp})}); },
    async getSession(token){ const a=await q('/leadgen_sessions?select=*&token=eq.'+enc(token)); return a&&a[0]?{exp:Number(a[0].exp)}:null; },
    async deleteSession(token){ await q('/leadgen_sessions?token=eq.'+enc(token),{method:'DELETE',headers:minimal}); },
    async listLeads(){ const a=await q('/leadgen_leads?select=data&order=created_at.desc'); return (a||[]).map(r=>r.data); },
    async getLead(id){ const a=await q('/leadgen_leads?select=data&id=eq.'+enc(id)); return a&&a[0]?a[0].data:null; },
    async addLead(l){ await q('/leadgen_leads',{method:'POST',headers:minimal,body:JSON.stringify({id:l.id,stage:l.stage,created_at:l.createdAt,data:l})}); return l; },
    async addLeads(ls){ if(!ls.length)return ls; await q('/leadgen_leads',{method:'POST',headers:minimal,body:JSON.stringify(ls.map(l=>({id:l.id,stage:l.stage,created_at:l.createdAt,data:l})))}); return ls; },
    async updateLead(id,lead){ await q('/leadgen_leads?id=eq.'+enc(id),{method:'PATCH',headers:minimal,body:JSON.stringify({stage:lead.stage,data:lead})}); return lead; },
    async deleteLead(id){ await q('/leadgen_leads?id=eq.'+enc(id),{method:'DELETE',headers:minimal}); }
  };
}

const STORE = USE_SB ? makeSupabaseStore() : makeJsonStore();

/* ---------- helpers ---------- */
const newId = p => p + crypto.randomBytes(8).toString('hex');
const hashPw = (pw,salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function pwMatches(pw, settings){
  const a = Buffer.from(hashPw(pw, settings.salt), 'hex');
  const b = Buffer.from(settings.pass, 'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
function send(res,code,obj,headers){ res.writeHead(code, Object.assign({'content-type':'application/json'}, headers||{})); res.end(JSON.stringify(obj)); }
function readBody(req){ return new Promise(r=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ r(JSON.parse(b||'{}')); }catch(e){ r({}); } }); }); }
function parseCookies(req){ const h=req.headers.cookie||''; const o={}; h.split(';').forEach(p=>{ const i=p.indexOf('='); if(i>0) o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim()); }); return o; }
async function startSession(){ const t=crypto.randomBytes(24).toString('hex'); await STORE.createSession(t,Date.now()+30*864e5); return t; }
function sessionCookie(token,clear){ return {'Set-Cookie':`leadgen_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:30*86400}`}; }
async function authed(req){ const t=parseCookies(req).leadgen_session; if(!t) return false; const s=await STORE.getSession(t); return !!(s && s.exp>Date.now()); }
const pubSettings = s => ({ calendlyUrl:s.calendlyUrl||'', notifyEmail:s.notifyEmail||'', icp:s.icp||'' });
const clip = (v,n) => String(v==null?'':v).slice(0,n);
const today = () => new Date().toLocaleDateString('en-CA');

const DEFAULT_ICP = "Small business owners, solopreneurs, coaches, and consultants who want hands-on AI training or coaching. They're busy, non-technical, curious about AI but overwhelmed, and can invest in 1:1 or workshop help.";

// Optional pre-seeded credential (recommended for hosted deploys with the JSON
// DB, where a restart would otherwise re-open first-run setup to the public).
async function seedPassword(){
  if(!SEED_PASSWORD) return;
  const s = await STORE.getSettings();
  if(s && s.pass) return;
  const salt = crypto.randomBytes(16).toString('hex');
  await STORE.saveSettings(Object.assign({}, s||{}, {
    salt, pass: hashPw(SEED_PASSWORD, salt),
    calendlyUrl:(s&&s.calendlyUrl)||'', notifyEmail:(s&&s.notifyEmail)||'',
    icp:(s&&s.icp)||DEFAULT_ICP, createdAt:(s&&s.createdAt)||new Date().toISOString()
  }));
  console.log('LEADGEN: password seeded from LEADGEN_PASSWORD');
}

/* ============================================================
   IMPORT PARSER — pasted commenter lists → candidates.
   Always local & deterministic; the review UI is the safety net.
   ============================================================ */
function parseCSVLine(line){
  const out=[]; let cur='', inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(inQ){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else inQ=false; } else cur+=c; }
    else if(c==='"') inQ=true;
    else if(c===','){ out.push(cur); cur=''; }
    else cur+=c;
  }
  out.push(cur);
  return out.map(s=>s.trim());
}
function cleanName(s){
  return s.replace(/\s*[·•|,-]?\s*\(?(he|she|they)\s*\/\s*(him|her|them)\)?/gi,'')
          .replace(/\s*[·•]\s*(1st|2nd|3rd)\+?\s*(degree)?\s*(connection)?/gi,'')
          .replace(/\s*·\s*(Following|Premium|Author|Verified).*$/i,'')
          .replace(/\s{2,}/g,' ').trim();
}
const looksLikeHeadline = s => /(\||\bat\b|founder|coach|consultant|owner|ceo|director|manager|expert|specialist|strategist|advisor|principal|freelance|helping|I help)/i.test(s);
function parseRaw(raw){
  const warnings=[];
  const text=(raw||'').replace(/\r/g,'');
  const lines=text.split('\n');
  const firstLine=(lines.find(l=>l.trim())||'').toLowerCase();

  // 1) CSV with a header row naming the columns
  const headerHits=['name','headline','comment','url','profile'].filter(k=>firstLine.includes(k)).length;
  if(firstLine.includes(',') && headerHits>=2){
    const header=parseCSVLine(lines.find(l=>l.trim())).map(h=>h.toLowerCase());
    const idx=k=>header.findIndex(h=>h.includes(k));
    const iName=idx('name'), iHead=idx('headline'), iComm=idx('comment'), iUrl=header.findIndex(h=>h.includes('url')||h.includes('profile'));
    const rows=lines.slice(lines.findIndex(l=>l.trim())+1).filter(l=>l.trim());
    return { candidates: rows.map(r=>{
      const c=parseCSVLine(r);
      return { name:cleanName(c[iName]||''), headline:iHead>=0?(c[iHead]||''):'', comment:iComm>=0?(c[iComm]||''):'', linkedinUrl:iUrl>=0?(c[iUrl]||''):'' };
    }).filter(c=>c.name), warnings };
  }

  // 2) Tab- or pipe-delimited lines (name<TAB>headline<TAB>comment)
  const delim = lines.filter(l=>l.trim()).every(l=>l.includes('\t')) ? '\t'
              : lines.filter(l=>l.trim()).length>1 && lines.filter(l=>l.trim()).every(l=>l.split('|').length>=2) ? '|' : null;
  if(delim){
    return { candidates: lines.filter(l=>l.trim()).map(l=>{
      const c=l.split(delim).map(s=>s.trim());
      const urlIdx=c.findIndex(s=>s.includes('linkedin.com'));
      const linkedinUrl=urlIdx>=0?c.splice(urlIdx,1)[0]:'';
      return { name:cleanName(c[0]||''), headline:c[1]||'', comment:c.slice(2).join(' '), linkedinUrl };
    }).filter(c=>c.name), warnings };
  }

  // 3) Freeform blocks separated by blank lines (or "---")
  const blocks=text.split(/\n\s*\n|\n-{3,}\n/).map(b=>b.trim()).filter(Boolean);
  const candidates=blocks.map(block=>{
    const bl=block.split('\n').map(l=>l.trim()).filter(Boolean);
    const cand={ name:'', headline:'', comment:'', linkedinUrl:'' };
    const rest=[];
    bl.forEach((l,i)=>{
      if(l.includes('linkedin.com')){ const m=l.match(/https?:\/\/\S+/); cand.linkedinUrl=m?m[0]:l; return; }
      if(i===0){ cand.name=cleanName(l); return; }
      if(!cand.headline && (i===1 || looksLikeHeadline(l)) && !cand.comment){ cand.headline=l; return; }
      rest.push(l);
    });
    cand.comment=rest.join(' ');
    if(!cand.headline && !cand.comment) warnings.push(`"${cand.name}": only a name found — check this row`);
    return cand;
  }).filter(c=>c.name);
  if(!candidates.length && text.trim()) warnings.push('Nothing recognizable found — try one person per block, separated by blank lines');
  return { candidates, warnings };
}

/* ============================================================
   SCORING — Claude against the ICP, or a deterministic
   keyword heuristic in demo mode. Tier A>=70, B 40-69, C<40.
   ============================================================ */
const normName = s => (s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const normUrl = s => (s||'').toLowerCase().replace(/^https?:\/\/(www\.)?/,'').replace(/[?#].*$/,'').replace(/\/$/,'');
function findDuplicate(cand, leads){
  const n=normName(cand.name), u=normUrl(cand.linkedinUrl);
  const hit=leads.find(l=>(u && normUrl(l.linkedinUrl)===u) || (n && normName(l.name)===n));
  return hit?hit.id:null;
}
const tierFor = s => s>=70?'A':s>=40?'B':'C';

function demoScore(c){
  const head=(c.headline||'').toLowerCase(), comm=(c.comment||'').toLowerCase();
  let score=20; const why=[];
  if(/founder|owner|ceo|co-founder|coach|consultant|solopreneur|freelance|principal|director|president/.test(head)){ score+=30; why.push('decision-maker role in headline'); }
  if(/interested|how do i|how can i|struggling|need|want to learn|overwhelmed|please send|sign me up|yes please|would love|curious|where do i start/.test(comm)){ score+=25; why.push('expressed interest or pain in comment'); }
  if(/\bai\b|chatgpt|claude|automation|prompt|artificial intelligence/.test(head+' '+comm)){ score+=15; why.push('AI-curious'); }
  if(/small business|my business|studio|agency owner|my practice|my clients/.test(head+' '+comm)){ score+=10; why.push('small-business signals'); }
  if(/student|intern|seeking|open to work|aspiring|recruiter|talent acquisition/.test(head)){ score-=25; why.push('not a buyer (student/job-seeker/recruiter)'); }
  if(/ai (consultant|trainer|coach|expert|agency)|prompt engineer/.test(head)){ score-=25; why.push('likely a peer/competitor'); }
  score=Math.max(0,Math.min(100,score));
  return { score, tier:tierFor(score), reason:'Demo score: '+(why.length?why.join('; '):'no strong signals') };
}

async function callClaude(system, user, maxTokens, arrayMode){
  const res = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model:MODEL, max_tokens:maxTokens||2000, system, messages:[{role:'user',content:user}] })
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data.error&&data.error.message)||('HTTP '+res.status));
  let text=(data.content||[]).map(c=>c.text||'').join('').trim();
  const open=arrayMode?'[':'{', close=arrayMode?']':'}';
  const a=text.indexOf(open), z=text.lastIndexOf(close); if(a>=0&&z>a) text=text.slice(a,z+1);
  return JSON.parse(text);
}

function scoreSystemPrompt(icp){
  return `You score LinkedIn prospects for El Wong's business, Superpowers With AI (AI training & coaching).
IDEAL CLIENT PROFILE: ${icp}
Return ONLY a JSON array (no prose, no markdown fences), one object per input, same order:
[{"i":0,"score":0-100,"tier":"A|B|C","reason":"one short sentence citing their headline or comment"}]
Tier A = ideal fit likely to book a call (score >= 70). Tier B = worth a personalized DM (40-69). Tier C = polite thanks only (< 40).
Score on: role match (owner/solopreneur/coach/consultant), expressed pain or curiosity about AI in their comment, seniority and buying power.
Penalize: students, job seekers, recruiters, agencies selling TO the business, and obvious peers/competitors offering AI services themselves.`;
}

async function scoreCandidates(candidates, icp){
  if(!API_KEY){
    return { source:'demo', results: candidates.map(demoScore) };
  }
  const results=new Array(candidates.length); let anyClaude=false, anyDemo=false;
  for(let start=0; start<candidates.length; start+=25){
    const chunk=candidates.slice(start,start+25);
    const payload=chunk.map((c,j)=>({i:start+j, name:clip(c.name,120), headline:clip(c.headline,300), comment:clip(c.comment,600)}));
    try{
      const arr=await callClaude(scoreSystemPrompt(icp), JSON.stringify(payload), 2000, true);
      chunk.forEach((c,j)=>{
        const hit=Array.isArray(arr)?arr.find(r=>r&&r.i===start+j):null;
        if(hit && typeof hit.score==='number'){ results[start+j]={score:Math.max(0,Math.min(100,Math.round(hit.score))), tier:/^[ABC]$/.test(hit.tier)?hit.tier:tierFor(hit.score), reason:clip(hit.reason,300)}; anyClaude=true; }
        else { results[start+j]=demoScore(c); anyDemo=true; }
      });
    }catch(e){
      chunk.forEach((c,j)=>{ results[start+j]=demoScore(c); });
      anyDemo=true;
    }
  }
  return { source: anyClaude ? (anyDemo?'claude+demo':'claude') : 'demo', results };
}

/* ============================================================
   OUTREACH — 3-touch DM sequence, Claude or template fallback.
   Nothing is ever sent automatically; El copies each message.
   ============================================================ */
function outreachSystemPrompt(calendlyUrl){
  return `You draft LinkedIn DMs that El Wong (Superpowers With AI — AI training & coaching) sends manually, one at a time.
Voice: warm, direct, generous, zero hype, sounds like a real person texting a peer. 1-3 short sentences per message. Never "I hope this finds you well", never salesy.
Return ONLY JSON (no prose, no markdown fences):
{"touches":[
 {"label":"Touch 1 — connect & thank","message":"...","daysAfterPrevious":0},
 {"label":"Touch 2 — value","message":"...","daysAfterPrevious":3},
 {"label":"Touch 3 — soft invite","message":"...","daysAfterPrevious":4}]}
Touch 1 references their specific comment naturally and gives value or thanks — never pitches.
Touch 2 shares one genuinely useful tidbit tied to their headline or situation.
Touch 3 makes a soft, no-pressure invitation to a call${calendlyUrl?` and includes exactly this link: ${calendlyUrl}`:` and invites them to reply if interested — do NOT invent or include any link`}.`;
}
function demoOutreach(lead, calendlyUrl){
  const first=(lead.name||'there').split(' ')[0];
  const quote=lead.comment?` — "${clip(lead.comment,80)}"`:'';
  const t3link=calendlyUrl?`Here's my calendar if you'd like to grab 20 minutes: ${calendlyUrl}`:`Just reply here if you'd like to chat — no pressure at all.`;
  return { touches:[
    { label:'Touch 1 — connect & thank', message:`Hi ${first}! Loved your comment${quote}. Really appreciate you jumping in — happy to share more if it's useful.`, daysAfterPrevious:0 },
    { label:'Touch 2 — value', message:`Hey ${first}, this made me think of you${lead.headline?` given your work as ${clip(lead.headline,60)}`:''}: most business owners I work with save 3-4 hours a week with one simple AI workflow. Happy to share the one that would fit you best.`, daysAfterPrevious:3 },
    { label:'Touch 3 — soft invite', message:`${first}, if you ever want to talk through where AI could actually save you time (no pitch, promise), I'd love to hear what you're working on. ${t3link}`, daysAfterPrevious:4 }
  ]};
}
async function generateOutreach(lead, settings){
  const cal=settings.calendlyUrl||'';
  if(!API_KEY) return Object.assign(demoOutreach(lead,cal), {source:'demo'});
  try{
    const user=`LEAD: name="${clip(lead.name,120)}", headline="${clip(lead.headline,300)}", tier="${lead.tier||'?'}", source="${lead.source}${lead.sourceDetail?' — '+clip(lead.sourceDetail,120):''}".
THEIR COMMENT: "${clip(lead.comment,600)}"
MY NOTES ON THEM: "${clip(lead.notes,400)}"
IDEAL CLIENT PROFILE (for context): ${clip(settings.icp||DEFAULT_ICP,600)}`;
    const out=await callClaude(outreachSystemPrompt(cal), user, 1200, false);
    if(!out || !Array.isArray(out.touches) || out.touches.length<1) throw new Error('bad shape');
    out.touches=out.touches.slice(0,3).map((t,i)=>({ label:clip(t.label,80)||('Touch '+(i+1)), message:clip(t.message,1000), daysAfterPrevious:typeof t.daysAfterPrevious==='number'?t.daysAfterPrevious:(i===0?0:3), sent:false }));
    out.source='claude';
    return out;
  }catch(e){
    return Object.assign(demoOutreach(lead,cal), {source:'demo'});
  }
}

/* ---------- Resend email (optional) ---------- */
async function sendEmail(to, subject, html){
  if(!RESEND_KEY || !to) return {sent:false, reason:!RESEND_KEY?'no_key':'no_recipient'};
  try{
    const r=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:'Bearer '+RESEND_KEY,'content-type':'application/json'},
      body: JSON.stringify({from:RESEND_FROM, to:[to], subject, html})
    });
    return {sent:r.ok};
  }catch(e){ return {sent:false, reason:String(e.message||e)}; }
}

/* ---------- capture rate limit (in-memory, per IP) ---------- */
const captureHits = new Map();
function captureAllowed(ip){
  const now=Date.now(), hits=(captureHits.get(ip)||[]).filter(t=>now-t<3600e3);
  if(hits.length>=20) return false;
  hits.push(now); captureHits.set(ip,hits);
  return true;
}

/* ---------- lead helpers ---------- */
function makeLead(fields){
  const now=new Date().toISOString();
  return Object.assign({
    id:newId('l_'), name:'', headline:'', linkedinUrl:'', email:'',
    source:'manual', sourceDetail:'', comment:'',
    score:null, tier:null, scoreReason:'',
    stage:'new', tags:[], notes:'', nextFollowUp:null,
    outreach:null, activity:[{at:now,type:'created',text:'Lead created'}],
    createdAt:now, updatedAt:now
  }, fields);
}

/* ---------- server ---------- */
http.createServer(async (req,res)=>{
  const url = req.url.split('?')[0];
  const m = req.method;
  try {
    // AUTH — single-user, first-run password setup
    if(url==='/api/auth-state'){
      const s=await STORE.getSettings();
      return send(res,200,{setup:!!(s&&s.pass)});
    }
    if(url==='/api/setup' && m==='POST'){
      const s=await STORE.getSettings();
      if(s&&s.pass) return send(res,409,{error:'already_setup'});
      const {password}=await readBody(req);
      if(!password||password.length<8) return send(res,400,{error:'password_too_short'});
      const salt=crypto.randomBytes(16).toString('hex');
      await STORE.saveSettings({salt,pass:hashPw(password,salt),calendlyUrl:'',notifyEmail:'',icp:DEFAULT_ICP,createdAt:new Date().toISOString()});
      const t=await startSession();
      return send(res,200,{ok:true}, sessionCookie(t));
    }
    if(url==='/api/login' && m==='POST'){
      const s=await STORE.getSettings();
      const {password}=await readBody(req);
      if(!s||!s.pass||!password||!pwMatches(password,s)) return send(res,401,{error:'invalid'});
      const t=await startSession();
      return send(res,200,{ok:true}, sessionCookie(t));
    }
    if(url==='/api/logout' && m==='POST'){
      const t=parseCookies(req).leadgen_session; if(t) await STORE.deleteSession(t);
      return send(res,200,{ok:true}, sessionCookie('',true));
    }

    // CAPTURE — public, no auth (the only unauthenticated write)
    if(url==='/api/capture' && m==='POST'){
      const ip=(req.headers['x-forwarded-for']||'').split(',')[0].trim()||req.socket.remoteAddress||'?';
      if(!captureAllowed(ip)) return send(res,429,{error:'too_many'});
      const b=await readBody(req);
      const email=clip(b.email,200).trim().toLowerCase();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return send(res,400,{error:'invalid_email'});
      const name=clip(b.name,120).trim()||email.split('@')[0];
      const need=clip(b.need,2000).trim();
      const s=(await STORE.getSettings())||{};
      const lead=makeLead({name,email,source:'website',sourceDetail:'Capture page',comment:need});
      lead.activity.push({at:new Date().toISOString(),type:'captured',text:'Came in via the capture page'+(need?': "'+clip(need,120)+'"':'')});
      await STORE.addLead(lead);
      await sendEmail(s.notifyEmail,'New lead: '+name,
        `<p><strong>${name}</strong> (${email}) just came in via your capture page.</p>`+
        (need?`<p>What they need: ${need.replace(/</g,'&lt;')}</p>`:'')+
        `<p>Open your Leadgen CRM to follow up.</p>`).catch(()=>{});
      return send(res,200,{ok:true, calendlyUrl:s.calendlyUrl||''});
    }
    if(url==='/capture'){
      return fs.readFile(path.join(ROOT,'capture.html'),(err,data)=>{
        if(err){ res.writeHead(404); return res.end('not found'); }
        res.writeHead(200,{'Content-Type':'text/html'}); res.end(data);
      });
    }

    // Everything below /api/* requires auth
    if(url.startsWith('/api/')){
      if(!await authed(req)) return send(res,401,{error:'unauth'});

      if(url==='/api/status'){
        const s=(await STORE.getSettings())||{};
        return send(res,200,{ai:API_KEY?'claude':'demo', model:API_KEY?MODEL:null, db:STORE.kind, email:RESEND_KEY?'resend':'off', calendly:!!s.calendlyUrl});
      }
      if(url==='/api/settings' && m==='GET'){
        const s=(await STORE.getSettings())||{};
        return send(res,200,{settings:pubSettings(s)});
      }
      if(url==='/api/settings' && m==='PUT'){
        const s=await STORE.getSettings(); if(!s) return send(res,409,{error:'no_setup'});
        const b=await readBody(req);
        if('calendlyUrl' in b) s.calendlyUrl=clip(b.calendlyUrl,300).trim();
        if('notifyEmail' in b) s.notifyEmail=clip(b.notifyEmail,200).trim();
        if('icp' in b) s.icp=clip(b.icp,2000).trim()||DEFAULT_ICP;
        await STORE.saveSettings(s);
        return send(res,200,{settings:pubSettings(s)});
      }
      if(url==='/api/password' && m==='POST'){
        const s=await STORE.getSettings(); if(!s) return send(res,409,{error:'no_setup'});
        const {current,next}=await readBody(req);
        if(!current||!pwMatches(current,s)) return send(res,401,{error:'wrong_password'});
        if(!next||next.length<8) return send(res,400,{error:'password_too_short'});
        s.salt=crypto.randomBytes(16).toString('hex'); s.pass=hashPw(next,s.salt);
        await STORE.saveSettings(s);
        return send(res,200,{ok:true});
      }

      // LEADS
      if(url==='/api/leads' && m==='GET'){
        return send(res,200,{leads:await STORE.listLeads()});
      }
      if(url==='/api/leads' && m==='POST'){
        const b=await readBody(req);
        if(!b.name||!String(b.name).trim()) return send(res,400,{error:'missing_name'});
        const lead=makeLead({
          name:clip(b.name,120).trim(), headline:clip(b.headline,300), linkedinUrl:clip(b.linkedinUrl,300),
          email:clip(b.email,200), source:['manual','linkedin-import','website'].includes(b.source)?b.source:'manual',
          sourceDetail:clip(b.sourceDetail,200), comment:clip(b.comment,2000), notes:clip(b.notes,4000)
        });
        return send(res,200,{lead:await STORE.addLead(lead)});
      }
      if(url.startsWith('/api/leads/') && url.endsWith('/activity') && m==='POST'){
        const id=url.split('/')[3];
        const lead=await STORE.getLead(id); if(!lead) return send(res,404,{error:'notfound'});
        const b=await readBody(req);
        lead.activity.push({at:new Date().toISOString(), type:clip(b.type,30)||'note', text:clip(b.text,500)});
        lead.updatedAt=new Date().toISOString();
        return send(res,200,{lead:await STORE.updateLead(id,lead)});
      }
      if(url.startsWith('/api/leads/') && m==='PATCH'){
        const id=url.split('/').pop();
        const lead=await STORE.getLead(id); if(!lead) return send(res,404,{error:'notfound'});
        const b=await readBody(req);
        if('stage' in b){
          if(!STAGES.includes(b.stage)) return send(res,400,{error:'bad_stage'});
          if(b.stage!==lead.stage) lead.activity.push({at:new Date().toISOString(),type:'stage',text:'Stage: '+lead.stage+' → '+b.stage});
          lead.stage=b.stage;
        }
        if('nextFollowUp' in b) lead.nextFollowUp=b.nextFollowUp?clip(b.nextFollowUp,10):null;
        if('tags' in b && Array.isArray(b.tags)) lead.tags=b.tags.slice(0,20).map(t=>clip(t,40));
        if('notes' in b) lead.notes=clip(b.notes,4000);
        if('email' in b) lead.email=clip(b.email,200);
        if('name' in b && String(b.name).trim()) lead.name=clip(b.name,120).trim();
        if('headline' in b) lead.headline=clip(b.headline,300);
        if('linkedinUrl' in b) lead.linkedinUrl=clip(b.linkedinUrl,300);
        if('comment' in b) lead.comment=clip(b.comment,2000);
        if('outreach' in b) lead.outreach=b.outreach;
        lead.updatedAt=new Date().toISOString();
        return send(res,200,{lead:await STORE.updateLead(id,lead)});
      }
      if(url.startsWith('/api/leads/') && m==='DELETE'){
        await STORE.deleteLead(url.split('/').pop());
        return send(res,200,{ok:true});
      }

      // IMPORT — parse (local) → score (Claude/demo) → commit
      if(url==='/api/import/parse' && m==='POST'){
        const {raw}=await readBody(req);
        return send(res,200,parseRaw(clip(raw,200000)));
      }
      if(url==='/api/import/score' && m==='POST'){
        const {candidates}=await readBody(req);
        if(!Array.isArray(candidates)||!candidates.length) return send(res,400,{error:'no_candidates'});
        if(candidates.length>200) return send(res,400,{error:'too_many'});
        const s=(await STORE.getSettings())||{};
        const leads=await STORE.listLeads();
        const {source,results}=await scoreCandidates(candidates, s.icp||DEFAULT_ICP);
        return send(res,200,{source, candidates:candidates.map((c,i)=>Object.assign({}, c, results[i], {duplicateOf:findDuplicate(c,leads)}))});
      }
      if(url==='/api/import/commit' && m==='POST'){
        const {candidates,sourceDetail}=await readBody(req);
        if(!Array.isArray(candidates)||!candidates.length) return send(res,400,{error:'no_candidates'});
        if(candidates.length>200) return send(res,400,{error:'too_many'});
        const now=new Date().toISOString();
        const leads=candidates.filter(c=>c.name&&String(c.name).trim()).map(c=>{
          const lead=makeLead({
            name:clip(c.name,120).trim(), headline:clip(c.headline,300), linkedinUrl:clip(c.linkedinUrl,300),
            source:'linkedin-import', sourceDetail:clip(sourceDetail,200), comment:clip(c.comment,2000),
            score:typeof c.score==='number'?c.score:null, tier:/^[ABC]$/.test(c.tier)?c.tier:null, scoreReason:clip(c.reason||c.scoreReason,300)
          });
          if(lead.score!=null) lead.activity.push({at:now,type:'scored',text:'Scored '+lead.score+' (Tier '+lead.tier+'): '+lead.scoreReason});
          return lead;
        });
        await STORE.addLeads(leads);
        return send(res,200,{added:leads.length, leads});
      }

      // OUTREACH
      if(url.startsWith('/api/outreach/') && m==='POST'){
        const id=url.split('/').pop();
        const lead=await STORE.getLead(id); if(!lead) return send(res,404,{error:'notfound'});
        const s=(await STORE.getSettings())||{};
        const out=await generateOutreach(lead,s);
        out.generatedAt=new Date().toISOString();
        out.touches=out.touches.map(t=>Object.assign({sent:false},t));
        lead.outreach=out; lead.updatedAt=out.generatedAt;
        await STORE.updateLead(id,lead);
        return send(res,200,{outreach:out});
      }

      return send(res,404,{error:'unknown_endpoint'});
    }
  } catch(e){
    return send(res,500,{error:'server_error',detail:String(e.message||e)});
  }

  // static — allowlist only (the DB, .env, and server source must never be served)
  const STATIC = { '/':'index.html', '/index.html':'index.html', '/app.js':'app.js', '/capture.html':'capture.html' };
  const fname = STATIC[decodeURIComponent(url)];
  if(!fname){ res.writeHead(404); return res.end('not found'); }
  fs.readFile(path.join(ROOT,fname),(err,data)=>{
    if(err){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200,{'Content-Type':TYPES[path.extname(fname)]||'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT, async ()=>{
  await seedPassword();
  console.log('LEADGEN on http://localhost:'+PORT+' · DB: '+(USE_SB?'Supabase':'local JSON file')+' · AI: '+(API_KEY?('claude ('+MODEL+')'):'demo')+' · Email: '+(RESEND_KEY?'resend':'off'));
});
