// XPALLA local server — static app + auth + database + Claude generation.
// Zero external dependencies (Node built-ins only). Run: node server.js
//
// Storage: uses SUPABASE Postgres (via its REST API) when SUPABASE_URL +
// SUPABASE_SERVICE_KEY are set; otherwise falls back to a local JSON file so
// the app always runs. Auth (scrypt + session cookies) is unchanged either way.
//
// Config via environment OR a local .env file (see .env.example).

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;                       // works locally and on any host
const PORT = process.env.PORT || 4178;        // hosts (Render, etc.) assign PORT
const DBFILE = path.join(ROOT, 'xpalla-db.json');

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
const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-latest';
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || '';
// Treat unfilled .env.example placeholders as "not configured" so the app
// gracefully stays on the JSON fallback instead of failing against a fake URL.
const SB_PLACEHOLDER = /YOUR-|YOUR_|example\.supabase/i;
const USE_SB = !!(SB_URL.startsWith('http') && SB_KEY && !SB_PLACEHOLDER.test(SB_URL) && !SB_PLACEHOLDER.test(SB_KEY));
const TYPES = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml' };

/* ============================================================
   STORAGE ABSTRACTION — same interface, two backends.
   ============================================================ */
function makeJsonStore(){
  // Prefer an existing live DB; else seed from seed-db.json (so a fresh/ephemeral
  // host still has a working demo account); else start empty.
  let db;
  try{ db=JSON.parse(fs.readFileSync(DBFILE,'utf8')); }
  catch(e){ try{ db=JSON.parse(fs.readFileSync(path.join(ROOT,'seed-db.json'),'utf8')); }catch(e2){ db={}; } }
  db.users=db.users||[]; db.sessions=db.sessions||{}; db.brands=db.brands||{}; db.drafts=db.drafts||[];
  const save=()=>{ try{ fs.writeFileSync(DBFILE, JSON.stringify(db,null,2)); }catch(e){} };
  return {
    kind:'json',
    async getUserByEmail(email){ return db.users.find(u=>u.email===email)||null; },
    async getUserById(id){ return db.users.find(u=>u.id===id)||null; },
    async createUser(u){ db.users.push(u); save(); },
    async createSession(token,userId,exp){ db.sessions[token]={userId,exp}; save(); },
    async getSession(token){ return db.sessions[token]||null; },
    async deleteSession(token){ delete db.sessions[token]; save(); },
    async getBrand(userId){ return db.brands[userId]||null; },
    async setBrand(userId,data){ db.brands[userId]=data; save(); },
    async listDrafts(userId){ return db.drafts.filter(d=>d.userId===userId); },
    async addDraft(d){ db.drafts.unshift(d); save(); return d; },
    async getDraft(id,userId){ return db.drafts.find(x=>x.id===id&&x.userId===userId)||null; },
    async updateDraft(id,userId,patch){ const d=db.drafts.find(x=>x.id===id&&x.userId===userId); if(!d)return null; Object.assign(d,patch); save(); return d; },
    async deleteDraft(id,userId){ db.drafts=db.drafts.filter(x=>!(x.id===id&&x.userId===userId)); save(); }
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
  return {
    kind:'supabase',
    async getUserByEmail(email){ const a=await q('/xpalla_users?select=data&email=eq.'+enc(email)); return a&&a[0]?a[0].data:null; },
    async getUserById(id){ const a=await q('/xpalla_users?select=data&id=eq.'+enc(id)); return a&&a[0]?a[0].data:null; },
    async createUser(u){ await q('/xpalla_users',{method:'POST',headers:minimal,body:JSON.stringify({id:u.id,email:u.email,data:u})}); },
    async createSession(token,userId,exp){ await q('/xpalla_sessions',{method:'POST',headers:minimal,body:JSON.stringify({token,user_id:userId,exp})}); },
    async getSession(token){ const a=await q('/xpalla_sessions?select=*&token=eq.'+enc(token)); return a&&a[0]?{userId:a[0].user_id,exp:Number(a[0].exp)}:null; },
    async deleteSession(token){ await q('/xpalla_sessions?token=eq.'+enc(token),{method:'DELETE',headers:minimal}); },
    async getBrand(userId){ const a=await q('/xpalla_brands?select=data&user_id=eq.'+enc(userId)); return a&&a[0]?a[0].data:null; },
    async setBrand(userId,data){ await q('/xpalla_brands?on_conflict=user_id',{method:'POST',headers:Object.assign({},H,{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({user_id:userId,data})}); },
    async listDrafts(userId){ const a=await q('/xpalla_drafts?select=data&user_id=eq.'+enc(userId)+'&order=created_at.desc'); return (a||[]).map(r=>r.data); },
    async addDraft(d){ await q('/xpalla_drafts',{method:'POST',headers:minimal,body:JSON.stringify({id:d.id,user_id:d.userId,created_at:d.createdAt,data:d})}); return d; },
    async getDraft(id,userId){ const a=await q('/xpalla_drafts?select=data&id=eq.'+enc(id)+'&user_id=eq.'+enc(userId)); return a&&a[0]?a[0].data:null; },
    async updateDraft(id,userId,patch){ const cur=await this.getDraft(id,userId); if(!cur)return null; const nd=Object.assign({},cur,patch); await q('/xpalla_drafts?id=eq.'+enc(id)+'&user_id=eq.'+enc(userId),{method:'PATCH',headers:minimal,body:JSON.stringify({data:nd})}); return nd; },
    async deleteDraft(id,userId){ await q('/xpalla_drafts?id=eq.'+enc(id)+'&user_id=eq.'+enc(userId),{method:'DELETE',headers:minimal}); }
  };
}

const STORE = USE_SB ? makeSupabaseStore() : makeJsonStore();

/* ---------- helpers ---------- */
const newId = p => p + crypto.randomBytes(8).toString('hex');
const hashPw = (pw,salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function send(res,code,obj,headers){ res.writeHead(code, Object.assign({'content-type':'application/json'}, headers||{})); res.end(JSON.stringify(obj)); }
function readBody(req){ return new Promise(r=>{ let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ r(JSON.parse(b||'{}')); }catch(e){ r({}); } }); }); }
function parseCookies(req){ const h=req.headers.cookie||''; const o={}; h.split(';').forEach(p=>{ const i=p.indexOf('='); if(i>0) o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim()); }); return o; }
async function startSession(userId){ const t=crypto.randomBytes(24).toString('hex'); await STORE.createSession(t,userId,Date.now()+30*864e5); return t; }
function sessionCookie(token,clear){ return {'Set-Cookie':`xpalla_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:30*86400}`}; }
async function userFromReq(req){ const t=parseCookies(req).xpalla_session; if(!t) return null; const s=await STORE.getSession(t); if(!s||s.exp<Date.now()) return null; return await STORE.getUserById(s.userId); }
const pub = u => ({ id:u.id, email:u.email, name:u.name });

/* ---------- Claude generation ---------- */
const RULES = {
  LinkedIn:`LINKEDIN 2026 ALGORITHM RULES:
- Dwell time, saves, and meaningful comments are the top ranking signals (NOT likes).
- Hook = first 2 lines before "…see more": open a curiosity gap. Line 1 <=62 chars, line 2 <=50 chars.
- Body ~800-1000 chars, one idea per line, grade-8 readability, sparse emojis.
- End with ONE specific, experience-based question (never "Comment YES" bait).
- Links KILL reach: put any link in a "first comment" block, never the body.
- Hashtags: max 3. Document carousels and polls get the best reach; video only wins with high completion.`,
  Instagram:`INSTAGRAM 2026 ALGORITHM RULES:
- SENDS (DM shares) are the #1 signal, then watch-time, saves, comments. Likes weakest.
- Make content one viewer wants to send to ONE friend. Always include explicit SEND and SAVE CTAs.
- Caption first line = hook + a natural search keyword (IG indexes captions; keywords beat hashtags).
- Hashtags: max 5. Carousels get a "second chance" re-show, so the cover (<=10 words) is everything.
- Reels: hook in first 3s, 7-30s, vertical, burned-in captions. Original content only.`
};
function systemPrompt(platform, format){
  return `You are XPALLA's content engine for Generation X women building a personal brand. Tone: warm, candid, authoritative; substance over hype; concrete and first-person.

${RULES[platform]}

Return ONLY one valid JSON object (no prose, no markdown fences) with this shape:
{
  "meta": ["3-4 short status pills"],
  "hooks": [ ${platform==='LinkedIn' ? '{"style":"Framework","lines":["line1","line2"]}' : '{"style":"Framework","text":"<=12 word hook"}'}, ...exactly 3 DISTINCT options... ],
  "variantIndex": <requested hookIndex>,
  "blocks": [ {"label":"section label","text":"content","kind":"hook (only on the hook block)"} ],
  ${format && /[Cc]arousel/.test(format) ? '"slides": [ {"kind":"cover|content|cta","title":"...","body":"..."} ],' : ''}
  ${format==='Poll' ? '"poll": {"question":"...","options":["a","b","c"]},' : ''}
  "hashtags": ["#x"],
  "playbook": ["4 specific algorithm-grounded reasons this will perform"],
  "checklist": ["4 before-you-post actions"]
}
Build "blocks" from hooks[variantIndex]. Make the 3 hooks genuinely different angles, in the brand's voice.`;
}
function userPrompt(p){
  const b=p.brand||{};
  return `Generate a ${p.platform} ${p.format}.
BRAND: name="${b.name||''}", niche="${b.niche||''}", years="${b.years||''}", audience="${b.audience||''}", outcome="${b.outcome||''}", voice=${JSON.stringify(b.voice||[])}.
TOPIC: "${p.topic||'(brand-guided)'}". HOOK STYLE: "${p.hookStyle||'Auto'}". TONE: "${p.tone||'Warm'}". Use hookIndex=${p.hookIndex||0} as variantIndex.
If this is a Video or Reel, write a timestamped script that genuinely fills ${p.scriptLen||'30–60s'} — pace the beats across the full duration (a 30–60s script should run to ~0:55–0:60) and keep momentum so completion stays high. Label that script block "${p.scriptLen||'30–60s'} script".`;
}
async function callClaude(payload){
  const res = await fetch('https://api.anthropic.com/v1/messages',{
    method:'POST',
    headers:{'content-type':'application/json','x-api-key':API_KEY,'anthropic-version':'2023-06-01'},
    body: JSON.stringify({ model:MODEL, max_tokens:2400, system:systemPrompt(payload.platform,payload.format), messages:[{role:'user',content:userPrompt(payload)}] })
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data.error&&data.error.message)||('HTTP '+res.status));
  let text=(data.content||[]).map(c=>c.text||'').join('').trim();
  const a=text.indexOf('{'), z=text.lastIndexOf('}'); if(a>=0&&z>a) text=text.slice(a,z+1);
  return JSON.parse(text);
}

/* ---------- server ---------- */
http.createServer(async (req,res)=>{
  const url = req.url.split('?')[0];
  const m = req.method;
  try {
    // AUTH
    if(url==='/api/signup' && m==='POST'){
      const {email,password,name}=await readBody(req);
      if(!email||!password) return send(res,400,{error:'missing'});
      if(await STORE.getUserByEmail(email.toLowerCase())) return send(res,409,{error:'exists'});
      const salt=crypto.randomBytes(16).toString('hex');
      const user={id:newId('u_'),email:email.toLowerCase(),name:name||'',salt,pass:hashPw(password,salt),createdAt:new Date().toISOString()};
      await STORE.createUser(user); const t=await startSession(user.id);
      return send(res,200,{user:pub(user),brand:null}, sessionCookie(t));
    }
    if(url==='/api/login' && m==='POST'){
      const {email,password}=await readBody(req);
      const user=await STORE.getUserByEmail((email||'').toLowerCase());
      if(!user || user.pass!==hashPw(password||'',user.salt)) return send(res,401,{error:'invalid'});
      const t=await startSession(user.id);
      return send(res,200,{user:pub(user),brand:await STORE.getBrand(user.id)}, sessionCookie(t));
    }
    if(url==='/api/logout' && m==='POST'){
      const t=parseCookies(req).xpalla_session; if(t) await STORE.deleteSession(t);
      return send(res,200,{ok:true}, sessionCookie('',true));
    }
    if(url==='/api/me'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      return send(res,200,{user:pub(u),brand:await STORE.getBrand(u.id)});
    }
    // BRAND
    if(url==='/api/brand' && m==='PUT'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      const b=await readBody(req); await STORE.setBrand(u.id,b); return send(res,200,{brand:b});
    }
    // DRAFTS
    if(url==='/api/drafts' && m==='GET'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      return send(res,200,{drafts:await STORE.listDrafts(u.id)});
    }
    if(url==='/api/drafts' && m==='POST'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      const d=await readBody(req); d.id=newId('d_'); d.userId=u.id; d.createdAt=new Date().toISOString();
      d.scheduledFor=d.scheduledFor||null; d.status=d.status||'draft'; d.metrics=d.metrics||null;
      return send(res,200,{draft:await STORE.addDraft(d)});
    }
    if(url.startsWith('/api/drafts/') && m==='PATCH'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      const d=await STORE.updateDraft(url.split('/').pop(), u.id, await readBody(req));
      return d ? send(res,200,{draft:d}) : send(res,404,{error:'notfound'});
    }
    if(url.startsWith('/api/drafts/') && m==='DELETE'){
      const u=await userFromReq(req); if(!u) return send(res,401,{error:'unauth'});
      await STORE.deleteDraft(url.split('/').pop(), u.id); return send(res,200,{ok:true});
    }
    // AI
    if(url==='/api/status'){ return send(res,200,{mode:API_KEY?'claude':'demo',model:API_KEY?MODEL:null,db:STORE.kind}); }
    if(url==='/api/generate' && m==='POST'){
      if(!API_KEY) return send(res,503,{error:'no_key'});
      try{ return send(res,200, await callClaude(await readBody(req))); }
      catch(e){ return send(res,502,{error:'generation_failed',detail:String(e.message||e)}); }
    }
  } catch(e){
    return send(res,500,{error:'server_error',detail:String(e.message||e)});
  }

  // static
  let p=decodeURIComponent(url); if(p==='/'||p==='') p='/index.html';
  const file=path.join(ROOT,p);
  if(!file.startsWith(ROOT)){ res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file,(err,data)=>{
    if(err){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});
    res.end(data);
  });
}).listen(PORT,()=>console.log('XPALLA on http://localhost:'+PORT+' · DB: '+(USE_SB?'Supabase':'local JSON file')+' · AI: '+(API_KEY?('claude ('+MODEL+')'):'demo')));
